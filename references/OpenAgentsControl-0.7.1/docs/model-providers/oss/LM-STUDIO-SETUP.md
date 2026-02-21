# LM Studio Optimal Settings for OpenCode

This guide provides battle-tested configurations for running Qwen3-Coder and GPT-OSS-20B with OpenCode via LM Studio.

## Quick Start

1. Copy the configuration from `lmstudio-config-example.json` to your `opencode.json`
2. Download your models in LM Studio
3. Start the LM Studio server on port 1234
4. Launch OpenCode and use `/models` to select your local model

---

## Model-Specific Settings

### **Qwen3-Coder-30B** (Recommended Primary Model)

Best for: Precise tool calling, code generation, debugging

```json
{
  "limit": {
    "context": 24000,
    "output": 4000
  },
  "options": {
    "temperature": 0.1,
    "topP": 0.8,
    "minP": 0.01,
    "repetitionPenalty": 1.05
  }
}
```

**Why these settings:**
- **Temperature 0.1**: Maximizes deterministic tool calling reliability. Use 0.2-0.3 for more creative exploration.
- **Top-P 0.8**: Constrains token diversity appropriately for coding tasks
- **Min-P 0.01**: Lower than llama.cpp default (0.1) for better tool use
- **Repetition Penalty 1.05**: Prevents infinite loops during multi-step tool calls
- **Context 24000**: Handles large codebases without frequent compaction
- **Output 4000**: Sufficient for most code generation tasks

### **GPT-OSS-20B** (Alternative/Backup Model)

Best for: General coding, conversation, when you need higher creativity

```json
{
  "limit": {
    "context": 16000,
    "output": 4000
  },
  "options": {
    "temperature": 0.4,
    "topP": 0.9,
    "minP": 0.05,
    "repetitionPenalty": 1.05
  }
}
```

**Why these settings:**
- **Temperature 0.4**: Higher than Qwen3 due to different architecture - still reliable for tools
- **Top-P 0.9**: More diversity for MoE (Mixture of Experts) architecture
- **Min-P 0.05**: Slightly higher for better creative balance
- **Repetition Penalty 1.05**: Same as Qwen3 for loop prevention
- **Context 16000**: Sufficient for most tasks, adjust based on VRAM

---

## LM Studio Application Settings

### **GPU Acceleration (Critical)**

In LM Studio Settings → Hardware:

1. **GPU Offload Layers**: Set to MAXIMUM your GPU can handle
   - RTX 4060 8GB: 36 layers
   - RTX 4070 12GB: 40 layers
   - RTX 4090 24GB: All layers
   - Mac M1/M2/M3: All layers (MLX preferred)

2. **Keep Model in VRAM**: ✅ Enable
3. **Offload KV Cache to GPU**: ✅ Enable (4x speedup on compatible hardware)

### **Context Settings**

- **Context Length**: Match or exceed your config (24000 for Qwen3, 16000 for GPT-OSS)
- **Batch Size**: 512 (default) or higher if VRAM allows
- **Threads**: Set to CPU cores - 2 (e.g., 14 threads for 16-core CPU)

### **Speculative Decoding** (Advanced)

For 30B+ models, enable speculative decoding:
- **Draft Model**: Use a small 1-3B model from the same family
- **Speedup**: 1.5x-3x without quality loss

---

## OpenCode Integration

### Full Configuration Example

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lmstudio": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LM Studio (Local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      },
      "models": {
        "qwen3-coder-30b": {
          "name": "Qwen3-Coder-30B (Local)",
          "tools": true,
          "limit": {
            "context": 24000,
            "output": 4000
          },
          "options": {
            "temperature": 0.1,
            "topP": 0.8,
            "minP": 0.01,
            "repetitionPenalty": 1.05
          }
        },
        "gpt-oss-20b": {
          "name": "GPT-OSS-20B (Local)",
          "tools": true,
          "limit": {
            "context": 16000,
            "output": 4000
          },
          "options": {
            "temperature": 0.4,
            "topP": 0.9,
            "minP": 0.05,
            "repetitionPenalty": 1.05
          }
        }
      }
    }
  },
  "model": "lmstudio/qwen3-coder-30b",
  "agents": {
    "build": {
      "mode": "primary",
      "description": "Main build agent"
    }
  }
}
```

### Switching Models

Use the `/models` command in OpenCode to switch between your configured models without restarting.

---

## Troubleshooting

### Tool Calls Not Working

1. **Increase context window** in LM Studio to 16k-32k minimum
2. **Verify temperature** is set correctly (0.1 for Qwen3, 0.4 for GPT-OSS)
3. **Check repetition penalty** is set to 1.05
4. **Restart LM Studio server** after changing settings

### Slow Performance

1. **Maximize GPU layers** - check LM Studio logs for "offloaded X/Y layers"
2. **Enable KV cache offload** in GPU settings
3. **Reduce context length** if hitting VRAM limits
4. **Try speculative decoding** with a draft model

### Out of Memory

1. **Reduce context length**: 16000 → 12000 → 8000
2. **Reduce GPU layers**: Start at 50% and increase
3. **Switch to smaller quantization**: Q6 → Q5 → Q4
4. **Close other applications** using VRAM

### Model Repeating Itself

1. **Increase repetition penalty**: 1.05 → 1.10 → 1.15
2. **Lower temperature slightly**: 0.1 → 0.05
3. **Check min-P setting**: Should be 0.01-0.05

---

## Hardware Recommendations

### Minimum Specs (Qwen3-Coder-30B)
- **GPU**: 12GB VRAM (RTX 4070, RTX 3080 12GB)
- **RAM**: 16GB system RAM
- **Quantization**: Q4_K_M or Q5_K_M

### Recommended Specs (Qwen3-Coder-30B)
- **GPU**: 16-24GB VRAM (RTX 4080, RTX 4090)
- **RAM**: 32GB system RAM
- **Quantization**: Q6_K or Q8

### Minimum Specs (GPT-OSS-20B)
- **GPU**: 8GB VRAM (RTX 4060)
- **RAM**: 16GB system RAM
- **Quantization**: Q4_K_M

### Mac Users
- **MLX versions strongly recommended** over GGUF
- Significantly faster on Apple Silicon
- Use LM Studio's MLX support or native MLX inference
- M1/M2/M3 with 16GB+ unified memory works well

---

## Performance Expectations

### Qwen3-Coder-30B (Q5_K_M on RTX 4080)
- **Tokens/second**: 15-25 t/s
- **Context loading**: 2-3 seconds
- **Tool call reliability**: 95%+

### GPT-OSS-20B (Q5_K_M on RTX 4060)
- **Tokens/second**: 20-30 t/s
- **Context loading**: 1-2 seconds
- **Tool call reliability**: 90%+

---

## Settings Comparison Table

| Setting | Qwen3-Coder | GPT-OSS-20B | Reasoning |
|---------|-------------|-------------|-----------|
| **Temperature** | 0.1 | 0.4 | Qwen3 needs lower for tool calling |
| **Top-P** | 0.8 | 0.9 | MoE models benefit from more diversity |
| **Min-P** | 0.01 | 0.05 | Lower for deterministic tool use |
| **Repetition Penalty** | 1.05 | 1.05 | Prevents loops in both |
| **Context** | 24000 | 16000 | Qwen3 handles larger contexts better |
| **Output** | 4000 | 4000 | Standard for code generation |

---

## When to Adjust Settings

### For More Creativity
- Increase temperature: 0.1 → 0.3 (Qwen3) or 0.4 → 0.6 (GPT-OSS)
- Increase top-P: 0.8 → 0.9 or 0.9 → 0.95

### For More Precision
- Decrease temperature: 0.1 → 0.05 (careful: may reduce quality)
- Decrease top-P: 0.8 → 0.7

### For Handling Repetition
- Increase repetition penalty: 1.05 → 1.10
- Add frequency penalty: 0 → 0.3

---

## Notes

- These settings are optimized for **tool calling reliability** with OpenCode
- Raw performance benchmarks show Ollama may be faster, but **tool calling is unreliable**
- LM Studio's proper parameter handling makes it the recommended choice for OpenCode
- Settings can be adjusted per-use-case, but these defaults work for 90% of coding tasks

