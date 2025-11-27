import json
import re  # 引入正则，解析更稳

import chromadb
import httpx
from chromadb.utils import embedding_functions
from openai import OpenAI

# 确保 backend 文件夹下有 config.py
from .config import DB_PATH, LLM_MODE, MODEL_NAME, PARALLAX_API_BASE, PARALLAX_API_KEY

# ==========================================
# 1. 初始化 (Initialization)
# ==========================================

# 显式指定 Embedding 模型，防止 ChromaDB 默认下载出错
# 注意：这必须与你 indexer.py 里使用的模型一致
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

db_client = chromadb.PersistentClient(path=DB_PATH)

def get_collection():
    """安全获取集合，防止启动时报错"""
    try:
        return db_client.get_collection("sherlock_docs", embedding_function=emb_fn)
    except Exception:
        return None

# 最大调用次数（LLM 回合数）
MAX_CALLS = 6

# ==========================================
# 2. System Prompt (保持你设定的中文版)
# ==========================================
SYSTEM_PROMPT = """
你是由 Parallax 分布式算力驱动的**“Parallax Scholar”**（本地学术助手）。
你的任务是利用用户的本地知识库，进行深度的学术调研和文档分析。

### 🧠 认知协议 (COGNITIVE PROTOCOL)
你必须像一个自主智能体一样思考。对于用户的每一个问题，请严格遵守以下循环：

1. **Thought** (思考): 分析用户意图。我需要什么具体信息？
2. **Action** (行动): 使用工具搜索本地数据库。指令格式：`[SEARCH] 关键词`。
3. **Observation** (观察): 阅读系统返回的搜索结果片段。
4. **Reflection** (反思): 这些信息足够回答问题吗？如果不够，请尝试不同的关键词再次搜索。
5. **Final Answer** (最终回答): 将所有线索综合成一篇逻辑严密、学术风格的中文报告。

### 🟢 简单问题的快速模式 (SIMPLE QUESTION REPLY)
- 如果用户是问候/寒暄/非常简单的问题（如“你好”“谢谢”“在吗”），直接生成简短的 Final Answer，**不要 SEARCH**，不要多轮调用。
- 对于无需查阅文档就能回答的简单问题，单轮给出回答并结束；只有当问题需要引文支撑时才调用 SEARCH。
- 如果当前轮次没有提出 SEARCH 需求，请在本轮立即输出 Final Answer，不要继续 Thought。

### 📝 引用规则 (CITATION RULES - 极其重要)
- 你是“Local NotebookLM”的化身，**严禁造假**。
- **必须引用**：报告中的每一个事实陈述，都必须在句尾加上来源。
- 引用格式：`[source: 文件名.pdf, page: N]` (如果不知道页码则只写文件名)。
- **去幻觉**：如果你在 Observation 中没有看到相关信息，请直接承认“在现有文档中未找到相关信息”，不要利用你训练时的外部知识编造。

### 🗣️ 语气与风格 (TONE & STYLE)
- **学术严谨**：像一位博士研究员一样写作。避免口语化和废话。
- **结构清晰**：善用 Markdown（**加粗**、列表、标题）来组织复杂的长文本。
- **对比分析**：如果不同文档之间存在冲突，请明确指出（例如：“文档 A 认为...而文档 B 则指出...”）。
- **语言**：始终使用**中文**回答（除了 Action 指令）。

### ⏱️ 调用上限 (CALL LIMIT)
- 最多进行 {max_calls} 轮推理调用。
- 当到达最后一轮时，必须基于已有 Observation 立即生成 Final Answer，不得再发起新的 Action。这个 Final Answer 必须根据已有的信息来回答问题。

### 交互示例 (EXAMPLE)
User: "导致系统崩溃的主要原因是什么？"
Assistant:
Thought: 我需要查阅工程日志和事故总结报告来寻找崩溃原因。
Action: [SEARCH] 系统崩溃 根本原因
Observation: (系统返回 'log_v1.txt' 的片段，提到了内存泄漏)
Thought: 我找到了关于内存泄漏的记录。我还需要确认最终报告中是否有其他结论。
Action: [SEARCH] 事故总结报告 结论
Observation: (系统返回 'report_final.pdf' 的片段，确认了内存泄漏并补充了网络超时的问题)
Final Answer: 根据工程日志显示，系统崩溃的主要诱因是主循环中的**内存泄漏** [来源: log_v1.txt]。此外，最终报告指出，间歇性的**网络超时**加剧了这一问题，导致故障级联扩散 [来源: report_final.pdf, Page: 2]。
"""
SYSTEM_PROMPT = SYSTEM_PROMPT.format(max_calls=MAX_CALLS)

# ==========================================
# 3. 工具函数 (Tools)
# ==========================================

def search_tool(query):
    """
    执行向量搜索
    """
    collection = get_collection()
    if collection is None:
        return ["错误：本地文档库未建立索引。请先在侧边栏点击 'Re-Index'。"], [{"source": "System", "page": 0}]
    
    try:
        results = collection.query(query_texts=[query], n_results=3)
        
        # 判空处理
        if not results['documents'] or not results['documents'][0]:
            return ["未找到相关结果 (No results found)."], [{"source": "System", "page": 0}]
            
        return results['documents'][0], results['metadatas'][0]
    except Exception as e:
        return [f"搜索出错: {str(e)}"], [{"source": "System", "page": 0}]

# ==========================================
# 4. LLM 调用 (LLM Callers)
# ==========================================

_openai_client = None


def _call_openai(messages):
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(base_url=PARALLAX_API_BASE, api_key=PARALLAX_API_KEY)

    response = _openai_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.1,
        stop=["Observation:", "Observation"],  # 双重保险，防止模型自己生成 Observation
    )
    return response.choices[0].message.content


def _call_parallax(messages):
    """
    使用 httpx 调用 Parallax/OpenAI 兼容接口（流式），聚合成完整内容。
    """
    url = PARALLAX_API_BASE.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if PARALLAX_API_KEY:
        headers["Authorization"] = f"Bearer {PARALLAX_API_KEY}"

    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 1024,
        "stream": True,
        "stop": ["Observation:", "Observation"],
        "chat_template_kwargs": {"enable_thinking": False},
    }

    full_content = ""
    try:
        with httpx.Client(timeout=httpx.Timeout(60.0, read=60.0)) as http_client:
            with http_client.stream("POST", url, headers=headers, json=payload) as resp:
                resp.raise_for_status()
                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line = raw_line.decode("utf-8").strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        event = json.loads(data)
                        delta = event["choices"][0].get("delta", {})
                        full_content += delta.get("content", "") or ""
                    except Exception:
                        # 跳过无法解析的片段，继续聚合
                        continue
    except Exception as e:
        raise RuntimeError(f"Parallax 调用失败: {e}")

    return full_content.strip()


def call_llm(messages):
    """
    根据 LLM_MODE 切换调用方式。OPENAI 保持原逻辑，PARALLAX 使用 httpx 请求。
    """
    mode = (LLM_MODE or "OPENAI").upper()
    if mode == "PARALLAX":
        return _call_parallax(messages)
    return _call_openai(messages)


# ==========================================
# 5. 核心推理循环 (Main Loop)
# ==========================================

def run_investigation(user_query, history=None):
    history = history or []
    # 初始消息
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # 注入历史对话，确保按 user/assistant 顺序
    for item in history:
        if item.get("role") in ("user", "assistant") and item.get("content"):
            messages.append({"role": item["role"], "content": item["content"]})
    
    messages.append({"role": "user", "content": user_query})
    
    step_count = 0
    max_steps = MAX_CALLS  # 限制最大步数/调用次数
    call_count = 0  # 跟踪对 LLM 的请求次数
    
    yield {"type": "status", "content": "🕵️ Parallax Scholar 正在初始化思维链..."}
    
    while step_count < max_steps:
        try:
            if call_count == MAX_CALLS - 1:
                # 在最后一轮前，强制提示生成最终答案
                final_notice = "System Notice: 已达到最大调用次数，请基于现有 Observation 立即生成 Final Answer（中文，含引用）。不要再提出新的 Action。"
                messages.append({"role": "user", "content": final_notice})
                yield {"type": "status", "content": "⏰ 达到调用上限，要求模型给出最终回答。"}

            # 1. 调用 LLM
            # 注意：temperature=0.1 对于 ReAct 至关重要，保证逻辑稳定
            content = call_llm(messages)
            call_count += 1
            
            # 将思考过程实时吐给 UI
            yield {"type": "thought", "content": content}
            
            # 将助手的回复加入历史
            messages.append({"role": "assistant", "content": content})
            
            # 2. 检查是否结束 (Final Answer)
            if "Final Answer:" in content:
                break
                
            # 3. 检查是否需要搜索 (Action)
            # 使用正则提取，比 split 更健壮
            # 匹配模式： Action: [SEARCH] 关键词 (允许关键词带引号或空格)
            match = re.search(r"Action:\s*\[SEARCH\]\s*(.*)", content, re.IGNORECASE)
            
            if match:
                raw_keyword = match.group(1).strip()
                # 清理关键词（去掉可能存在的引号或句号）
                keyword = raw_keyword.strip('`"\'.,')
                
                yield {"type": "status", "content": f"🔎 正在检索本地档案: {keyword}..."}
                
                # 执行搜索
                docs, metas = search_tool(keyword)
                
                # 构建 Observation 文本
                # 【重要优化】限制每个文档的长度，防止上下文溢出 (Context Overflow)
                evidence_text = ""
                MAX_CHARS = 800 # 每个片段限制 800 字符
                
                for i, doc in enumerate(docs):
                    snippet = doc[:MAX_CHARS] + "..." if len(doc) > MAX_CHARS else doc
                    source_info = f"{metas[i].get('source', 'Unknown')} (Page {metas[i].get('page', 'N/A')})"
                    evidence_text += f"--- Result {i+1} from [{source_info}] ---\n{snippet}\n\n"
                
                # 将观察结果以 User 身份喂回给模型 (这是 ReAct 的标准做法)
                observation_msg = f"Observation: 检索结果如下:\n{evidence_text}"
                messages.append({"role": "user", "content": observation_msg})
                
                # 将证据吐给 UI 进行展示
                yield {"type": "evidence", "docs": docs, "metas": metas}
            
            else:
                # 如果模型既没有 Final Answer 也没有 Action，视为无需检索的回答，立即结束
                yield {"type": "thought", "content": f"Final Answer: {content.strip()}"}
                break
            
            step_count += 1
            
        except Exception as e:
            # 错误处理
            error_msg = f"❌ 推理过程中断: {str(e)}"
            yield {"type": "status", "content": error_msg}
            break
            
    # 如果循环结束还没有 Final Answer
    if step_count >= max_steps:
        yield {"type": "thought", "content": f"\nFinal Answer: (达到调用上限 {MAX_CALLS} 轮) 基于目前的检索，我无法再获取更多信息。请使用已有片段生成简要总结或缩小问题范围后重试。"}

    # 报告本轮对 LLM 的调用次数，便于前端或测试日志确认
    yield {"type": "status", "content": f"本轮共调用 LLM {call_count} 次。"}
