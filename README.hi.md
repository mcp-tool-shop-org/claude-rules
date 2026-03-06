<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a> | <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img src="logo.png" width="400" alt="claude-rules">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/claude-rules/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/claude-rules/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/claude-rules"><img src="https://img.shields.io/npm/v/@mcptoolshop/claude-rules" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
</p>

अपनी CLAUDE.md को हल्का बनाएं।

`claude-rules` [Claude Code](https://docs.anthropic.com/en/docs/claude-code) के लिए एक डिस्पैच टेबल जनरेटर और इंस्ट्रक्शन-फ़ाइल ऑप्टिमाइज़र है। यह भारी इंस्ट्रक्शन फ़ाइलों को एक छोटे रूटिंग इंडेक्स (हमेशा लोड) और विषय-विशिष्ट नियम फ़ाइलों (मांग पर लोड) में विभाजित करता है, जिससे हर सेशन में कॉन्टेक्स्ट टोकन की बचत होती है।

## समस्या

CLAUDE.md फ़ाइलें समय के साथ बढ़ती जाती हैं। हर लाइन हर सेशन में टोकन खर्च करती है — चाहे वह प्रासंगिक हो या नहीं। 300 लाइनों की इंस्ट्रक्शन फ़ाइल चुपचाप मॉडल के हर विचार पर एक कर बन जाती है।

## समाधान

तीन परतें, कोई अस्पष्टता नहीं:

| परत | फ़ाइल | लोडिंग |
|------|--------|---------|
| ऑपरेटर कंसोल | `CLAUDE.md` | हमेशा (हल्का इंडेक्स) |
| डिस्पैच टेबल | `.claude/rules/index.json` | हमेशा (मशीन-पठनीय) |
| नियम फ़ाइलें | `.claude/rules/*.md` | मांग पर |

प्रत्येक नियम फ़ाइल अपने रूटिंग मेटाडेटा को frontmatter के रूप में रखती है:

```markdown
---
id: github-actions
keywords: [ci, workflow, runner, dependabot]
patterns: [ci_pipeline]
priority: domain
triggers:
  task: true
  plan: true
  edit: false
---

# GitHub Actions Rules
CI minutes are finite...
```

जब एजेंट किसी ऐसे कार्य को देखता है जिसमें "CI" या "workflow" का उल्लेख है, तो वह संबंधित नियम फ़ाइल पढ़ता है। बाकी अनलोड रहती हैं।

## इंस्टॉलेशन

```bash
npm install -g @mcptoolshop/claude-rules
# या
npx @mcptoolshop/claude-rules analyze
```

## उपयोग

### Analyze

अपनी CLAUDE.md सेक्शन को स्कोर करें और देखें क्या निकाला जा सकता है:

```bash
claude-rules analyze
claude-rules analyze .claude/CLAUDE.md
```

```
File: .claude/CLAUDE.md  (258 lines, ~2388 tokens)

Keep inline (core): 4 sections
✓ (preamble)  2 lines
✓ Role  9 lines
✓ Guardian Self-Check  4 lines
✓ Document Delight  8 lines

Proposed extractions: 8 sections
  1. "GitHub Actions Rules" (L92-149, 58 lines, ~330 tokens)
     → .claude/rules/github-actions.md
     keywords: [github, actions, workflow, runner]

Budget estimate:
  Always loaded:    ~208 tokens (23 lines)
  On-demand:        ~2180 tokens (225 lines)
  Savings:          91% per session
```

### Split

इंटरैक्टिव एक्सट्रैक्शन — आप हर सेक्शन को निकालने से पहले अनुमोदित करते हैं:

```bash
claude-rules split              # इंटरैक्टिव
claude-rules split --dry-run    # बिना लिखे प्रीव्यू
```

प्रत्येक प्रस्तावित एक्सट्रैक्शन एक प्रीव्यू, सुझाया गया फ़ाइलनाम, कीवर्ड और प्राथमिकता दिखाता है। आप हर एक को अनुमोदित या स्किप करते हैं।

### Validate

अपनी नियम निर्देशिका की स्वास्थ्य जांच करें:

```bash
claude-rules validate
```

जांचता है: गायब फ़ाइल संदर्भ, अनाथ नियम फ़ाइलें, frontmatter विचलन, डोमेन नियमों पर खाली कीवर्ड, डुप्लिकेट IDs।

### Stats

अपने सिस्टम की भौतिकी देखें:

```bash
claude-rules stats
```

```
claude-rules stats

  CLAUDE.md (always loaded)
    Lines: 42    Tokens (est): 320

  Rule files (on-demand)
    github-actions           56 lines    680 tokens  domain
    shipping                 38 lines    310 tokens  domain
    ownership                28 lines    210 tokens  domain
    ──────────────────────────────────────────────────────
    Total on-demand:        122 lines  1,200 tokens

  Budget
    Always loaded:         320 tokens
    On-demand total:     1,200 tokens
    Avg task load (est):   400 tokens
    Savings vs monolithic: 79%
```

## प्राथमिकता स्तर

| स्तर | व्यवहार | उदाहरण |
|-------|----------|---------|
| `core` | हमेशा CLAUDE.md में इनलाइन | "test is right until proven otherwise" |
| `domain` | जब कार्य कीवर्ड मिलते हैं तब लोड होता है | CI संपादित करते समय GitHub Actions नियम |
| `manual` | कभी स्वतः लोड नहीं होता, जानबूझकर खोजना होता है | अस्पष्ट प्लेटफ़ॉर्म विशेषताएं |

## रूटिंग कैसे काम करता है

एजेंट CLAUDE.md में डिस्पैच टेबल देखता है और दो संकेत उसे नियम फ़ाइल लोड करने के लिए प्रेरित करते हैं:

1. **सिमैंटिक मैच** — कार्य में "publishing" या "CI" का उल्लेख है
2. **स्पष्ट निर्देश** — CLAUDE.md कहता है "योजना बनाने या संपादित करने से पहले वह नियम फ़ाइल पढ़ो"

यह एजेंट लूप के लिए एक संकेत प्रणाली है, जादू नहीं। कीवर्ड मैचिंग और स्पष्ट निर्देश का संयोजन इसे विश्वसनीय बनाता है।

## अपरिवर्तनीय नियम

- हर निकाला गया सेक्शन CLAUDE.md में 1-लाइन सारांश छोड़ता है
- हर `domain`/`manual` नियम `index.json` में मौजूद है
- हर `core` नियम इनलाइन रहता है (कभी केवल फ़ाइल में नहीं निकाला जाता)
- Frontmatter सत्य का स्रोत है; `index.json` व्युत्पन्न है
- पार्सर केवल ATX शीर्षकों (`##`, `###`) पर विभाजित करता है

## सुरक्षा

यह उपकरण केवल स्थानीय markdown और JSON फ़ाइलें पढ़ता और लिखता है। यह कोई नेटवर्क अनुरोध नहीं करता, टेलीमेट्री एकत्र नहीं करता, और न ही किसी बाहरी सेवा तक पहुंचता है।

### खतरा मॉडल

| खतरा | शमन |
|-------|------|
| खराब विभाजन से डेटा हानि | इंटरैक्टिव अनुमोदन + `--dry-run` मोड |
| विकृत नियम फ़ाइलें | `validate` कमांड सभी संरचनात्मक समस्याओं को पकड़ता है |
| पुराना इंडेक्स | `validate` frontmatter और index.json के बीच विचलन का पता लगाता है |

पूर्ण सुरक्षा नीति के लिए [SECURITY.md](SECURITY.md) देखें।

---

[MCP Tool Shop](https://mcp-tool-shop.github.io/) द्वारा निर्मित
