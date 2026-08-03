import type {
  ActivityLog,
  ContactMethod,
  ContactStatus,
  DashboardBrief,
  NextStep,
  Person,
  Priority,
  ResearchOrganization,
  ResearchPoolState,
  ResearchStatus,
  WorkUpdate,
} from "./research-pool-types";

export const RESEARCH_STATUSES: ResearchStatus[] = [
  "待调研",
  "待联系",
  "已联系",
  "已回复",
  "已预约",
  "已访谈",
  "跟进中",
  "已结束",
  "长期维护",
  "暂停推进",
];

export const PRIORITIES: Priority[] = [
  "S",
  "A",
  "B",
  "C",
];

export const CONTACT_STATUSES: ContactStatus[] = [
  "暂不联系",
  "待批准联系",
  "计划联系",
  "已联系",
  "已回复",
  "已约访谈",
  "已完成访谈",
  "待跟进",
  "潜在合作线索",
  "已关闭",
];

export const ROLE_OPTIONS = [
  "Professor",
  "Principal Investigator",
  "Research Professor",
  "Postdoc",
  "PhD Student",
  "Master Student",
  "Research Scientist",
  "Industry Researcher",
] as const;

export const FLAG_OPTIONS = [
  "重点关注",
  "信息待核验",
  "近期联系",
  "需要上级判断",
  "潜在合作对象",
  "暂不推进",
] as const;

export const DEFAULT_RESEARCH_TOPICS = [
  "Embodied AI",
  "Vision-Language-Action",
  "Robot Manipulation",
  "Robot Learning",
  "Multi-Robot Systems",
  "Human-Robot Interaction",
  "Autonomous Navigation",
  "Sim-to-Real",
  "Soft Robotics",
  "Surgical Robotics",
  "Embodied Evaluation",
  "Formal Methods",
  "Robot Planning",
  "Real-world Data",
  "Benchmark",
  "Safe Reinforcement Learning",
  "Temporal Logic",
  "Neuro-symbolic AI",
  "AI Safety",
] as const;

export const DEFAULT_TAGS = [
  "VLA",
  "Multi-Robot",
  "Manipulation",
  "Real-world Data",
  "Benchmark Author",
  "BU",
  "MIT Connection",
  "Industry Connection",
  "SpecRLBench",
  "Safe RL",
  "Formal Specification",
] as const;

const today = "2026-07-17";
const initialCreatedAt = "2026-06-28";
const initialVerifiedAt = "2026-07-08";

const source = (title: string, url = "https://www.bu.edu/") => ({
  title,
  url,
  sourceType: "seed",
  accessedAt: today,
});

const contact = (
  type: ContactMethod["type"],
  value: string,
  label: string = type,
): ContactMethod => ({
  id: `contact-${type}-${value}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  type,
  label,
  value,
});

function buildResearchDocument(person: Person) {
  const sections = [
    ["简介", person.bio],
    ["当前研究重点", person.currentResearchFocus],
    ["研究方向", [...person.researchTopics, ...person.secondaryTopics].join("; ")],
    ["代表项目", person.representativeProjects.join("; ")],
    [
      "数据集 / 评测基准 / 机器人平台",
      [...person.datasets, ...person.benchmarks, ...person.robotPlatforms].join("; "),
    ],
    ["研究类型", person.researchMode],
    ["为什么值得关注", person.whyImportant],
    ["与 ZODA 的相关性", person.zodaRelevance],
    ["潜在数据需求", person.potentialDataNeed],
    ["评测基准价值", person.benchmarkValue],
    ["网络连接价值", person.networkValue],
    ["推荐接触方式", person.recommendedApproach],
    ["建议访谈问题", person.interviewQuestions],
  ];

  return sections
    .filter(([, value]) => value)
    .map(([label, value]) => `## ${label}\n${value}`)
    .join("\n\n");
}

function normalizePriority(value = ""): Priority {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "S" || /核心|高优先|高$/.test(value)) {
    return "S";
  }
  if (trimmed === "A" || /中高/.test(value)) {
    return "A";
  }
  if (trimmed === "B" || /中低|中/.test(value)) {
    return "B";
  }
  if (trimmed === "C" || /低|暂不|未评估/.test(value)) {
    return "C";
  }
  return "C";
}

const basePerson = (overrides: Partial<Person> & Pick<Person, "id" | "name">): Person => {
  const person: Person = {
    degree: "",
    avatarUrl: "",
    role: "PhD Student",
    title: "研究人员",
    institution: "Boston University",
    lab: "Collaborative Autonomy Group",
    department: "Engineering",
    location: "Boston, Massachusetts",
    bio: "具身智能科研对象池的种子记录。",
    currentResearchFocus: "需要在详细调研阶段进一步核验。",
    contacts: [contact("主页", "https://www.bu.edu/", "公开主页待核验")],
    feishuDocUrl: "",
    shortAssessment: "",
    supervisorNote: "",
    managerNote: "先补齐公开资料和联系人判断。",
    researchDocument: "",
    researchTopics: ["Embodied AI"],
    secondaryTopics: [],
    representativeProjects: [],
    representativePublications: [],
    datasets: [],
    benchmarks: [],
    robotPlatforms: [],
    researchMode: "仿真 + 真实机器人",
    whyImportant: "BU 优先调研阶段的种子对象。",
    zodaRelevance: "可能与具身数据、机器人评测基准或访谈调研相关。",
    potentialDataNeed: "未评估。",
    benchmarkValue: "未评估。",
    networkValue: "有助于扩展科研对象池。",
    recommendedApproach: "联系前先核验公开资料。",
    interviewQuestions:
      "下一步应该重点梳理哪些真实机器人数据、评测基准、合作者和实验室连接？",
    researchStatus: "待调研",
    priority: "未评估",
    contactStatus: "暂不联系",
    owner: "Eric",
    isStarred: false,
    flags: ["信息待核验"],
    tags: ["BU"],
    nextAction: "核验主页、实验室成员身份和代表成果。",
    followUpDate: "2026-07-30",
    advisorIds: [],
    adviseeIds: [],
    collaboratorIds: [],
    formerAffiliations: [],
    sources: [source("BU seed list")],
    archived: false,
    lastModifiedBy: "Eric",
    lastModifiedAt: "2026-07-16 15:00",
    lastVerifiedAt: initialVerifiedAt,
    createdAt: initialCreatedAt,
    updatedAt: today,
    ...overrides,
  };

  return {
    ...person,
    priority: normalizePriority(person.priority),
    isStarred: normalizePriority(person.priority) === "S" && person.isStarred,
    shortAssessment:
      overrides.shortAssessment ??
      (person.shortAssessment.includes("待补充") ? "" : person.shortAssessment),
    supervisorNote:
      overrides.supervisorNote ?? person.supervisorNote ?? person.managerNote ?? "",
    feishuDocUrl:
      overrides.feishuDocUrl ?? `https://example.feishu.cn/docx/${person.id}`,
    researchDocument: overrides.researchDocument ?? buildResearchDocument(person),
  };
};

export const seedPeople: Person[] = [
  basePerson({
    id: "alyssa-pierson",
    name: "Alyssa Pierson",
    degree: "PhD",
    role: "Professor",
    title: "Associate Professor",
    lab: "Collaborative Autonomy Group",
    department: "Mechanical Engineering",
    bio: "研究方向包括协作自主、多机器人系统、机器人规划和人机交互。",
    currentResearchFocus:
      "面向人机约束的协作自主和多机器人决策。",
    researchTopics: ["Multi-Robot Systems", "Human-Robot Interaction", "Robot Planning"],
    secondaryTopics: ["Embodied AI", "Autonomous Navigation"],
    representativeProjects: ["Collaborative autonomy research mapping seed"],
    representativePublications: [
      {
        title: "Representative multi-robot autonomy publication",
        year: "TBD",
        venue: "TBD",
        url: "",
        summary: "待补充核验后的代表性成果。",
      },
    ],
    robotPlatforms: ["Mobile robots", "Multi-robot systems"],
    whyImportant:
      "BU 多机器人自主和人机协作方向的重要种子对象。",
    priority: "高",
    researchStatus: "待联系",
    contactStatus: "待批准联系",
    isStarred: true,
    flags: ["重点关注", "需要上级判断", "近期联系"],
    tags: ["BU", "Multi-Robot", "Real-world Data"],
    nextAction: "请上级判断是否批准进入初步联系。",
    managerNote: "优先确认是否批准联系，并核验真实机器人数据或多机器人 benchmark。",
    followUpDate: "2026-07-20",
    createdAt: "2026-07-15",
    lastVerifiedAt: "2026-07-15",
    adviseeIds: ["akua-dickson", "sabbir-ahmad"],
    collaboratorIds: ["roberto-tron"],
  }),
  basePerson({
    id: "eshed-ohn-bar",
    name: "Eshed Ohn-Bar",
    degree: "PhD",
    role: "Principal Investigator",
    title: "Assistant Professor",
    lab: "H2X Lab",
    department: "Electrical and Computer Engineering",
    bio: "研究方向包括具身感知、人本自主系统和学习系统。",
    currentResearchFocus:
      "人本具身 AI、多模态感知和面向自主系统的学习方法。",
    researchTopics: ["Embodied AI", "Vision-Language-Action", "Robot Learning"],
    secondaryTopics: ["Human-Robot Interaction", "Autonomous Navigation"],
    robotPlatforms: ["Autonomous systems"],
    whyImportant: "与具身智能和 Physical AI 定位高度相关。",
    priority: "高",
    researchStatus: "已访谈",
    contactStatus: "计划联系",
    isStarred: true,
    flags: ["重点关注", "信息待核验"],
    tags: ["BU", "VLA", "Real-world Data"],
    nextAction: "补充实验室主页、当前学生和代表项目。",
    createdAt: "2026-07-14",
    lastVerifiedAt: "2026-07-15",
    advisorIds: [],
    adviseeIds: ["kamran-vakil"],
  }),
  basePerson({
    id: "andrew-sabelhaus",
    name: "Andrew Sabelhaus",
    degree: "PhD",
    role: "Principal Investigator",
    title: "Assistant Professor",
    lab: "Soft Robotics Control Lab",
    department: "Mechanical Engineering",
    bio: "研究方向包括软体机器人、控制和物理具身机器人系统。",
    currentResearchFocus: "软体机器人系统的控制方法和物理设计。",
    researchTopics: ["Soft Robotics", "Control Systems", "Robot Manipulation"],
    secondaryTopics: ["Sim-to-Real", "Robot Learning"],
    robotPlatforms: ["Soft robots"],
    researchMode: "Real-world",
    whyImportant: "对软体机器人和控制导向的 Physical AI 方向有价值。",
    priority: "高",
    researchStatus: "跟进中",
    contactStatus: "暂不联系",
    flags: ["潜在合作对象"],
    tags: ["BU", "Manipulation"],
    lastVerifiedAt: "2026-07-14",
    adviseeIds: ["brennan-brodt"],
    collaboratorIds: ["tommaso-ranzani"],
  }),
  basePerson({
    id: "wenchao-li",
    name: "Wenchao Li",
    degree: "PhD",
    role: "Professor",
    title: "Associate Professor",
    lab: "Dependable Computing Lab",
    department: "Electrical and Computer Engineering",
    bio: "BU ECE Associate Professor，Dependable Computing Lab PI，研究方向包括形式化方法、neuro-symbolic reasoning、AI safety 和 specification-guided imitation learning。",
    currentResearchFocus:
      "Specification-guided learning、Safe RL、Temporal Logic 与安全关键自主系统。",
    contacts: [
      contact("邮箱", "wenchao@bu.edu"),
      contact("主页", "https://www.bu.edu/eng/profile/wenchao-li-ph-d/", "BU Profile"),
      contact("主页", "https://sites.bu.edu/depend/people/", "Depend Lab People"),
    ],
    shortAssessment:
      "Dependable Computing Lab 战略负责人。应在先确认 SpecRLBench 扩展需求后联系，重点讨论真实任务、语言接口、评测平台和产业应用。",
    researchTopics: ["Formal Methods", "Embodied Evaluation", "Safe Reinforcement Learning"],
    secondaryTopics: ["Temporal Logic", "Neuro-symbolic AI", "AI Safety"],
    researchMode: "仿真",
    representativeProjects: [
      "SpecRLBench",
      "NSF CAREER: Specification-Guided Imitation Learning",
    ],
    benchmarks: ["SpecRLBench", "DSRL"],
    whyImportant:
      "实验室已经从安全 RL 方法发展到统一 Benchmark 建设，具备把复杂任务、安全要求和时间顺序形式化为可验证评测的能力。",
    zodaRelevance:
      "ZODA 可补充真实物体、房间场景、多模态观察、自然语言指令、评测服务器、leaderboard 和 Challenge 运营。",
    potentialDataNeed:
      "真实家庭物体、抓取/放置/开关/清理任务、RGB-D/视频/语言指令、长程组合任务、安全区域和多种 embodiment。",
    benchmarkValue:
      "适合把 SpecRLBench 从抽象仿真扩展为具身智能 Benchmark，连接自然语言、形式化规格、执行策略和过程验证。",
    networkValue:
      "可作为实验室路线和正式合作的升级联系人，但不建议第一轮泛泛联系 PI。",
    recommendedApproach:
      "先联系 Zijian Guo 或 İlker Işık 获取具体缺口，再带着 SpecRLBench-Embodied 或 Natural Language ↔ Formal Specification Benchmark 方案升级联系。",
    interviewQuestions:
      "SpecRLBench 下一版最希望增加哪些真实任务、观察模态、任务规格和评测基础设施？是否考虑 VLA、语言指令或真实机器人数据？",
    priority: "A",
    researchStatus: "待联系",
    contactStatus: "暂不联系",
    flags: ["重点关注", "需要上级判断", "潜在合作对象"],
    tags: ["BU", "Benchmark Author", "SpecRLBench", "Formal Specification"],
    nextAction: "后置联系：先从 Zijian / İlker 获取 SpecRLBench 扩展需求，再升级给 PI。",
    managerNote:
      "A 但后置联系。核心价值不是真实机器人数据，而是形式化规格、安全约束和可复现 Benchmark 方法论。",
    lastVerifiedAt: "2026-08-03",
    updatedAt: "2026-08-03",
    adviseeIds: ["zijian-guo", "ilker-isik", "sabbir-ahmad", "chenyu-wang"],
    sources: [
      source("Dependable Computing Laboratory People", "https://sites.bu.edu/depend/people/"),
      source("CAREER: Specification-Guided Imitation Learning", "https://www.bu.edu/cise/research/career-specification-guided-imitation-learning/"),
      source("Wenchao Li BU Profile", "https://www.bu.edu/eng/profile/wenchao-li-ph-d/"),
    ],
  }),
  basePerson({
    id: "zijian-guo",
    name: "Zijian Guo",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Dependable Computing Lab",
    department: "Systems Engineering",
    bio: "BU Systems Engineering 三年级博士生，SpecRLBench、GenZ-LTL、CCAC 和 SDT 等 specification-guided RL / Benchmark 路线的核心负责人。",
    currentResearchFocus:
      "Specification-guided RL、Temporal Logic、Safe RL、长程任务泛化和安全 Benchmark。",
    contacts: [
      contact("邮箱", "zjguo@bu.edu"),
      contact("主页", "https://ja4822.github.io/zijianguo.github.io/", "个人主页"),
      contact("主页", "https://github.com/BU-DEPEND-Lab/SpecRLBench", "SpecRLBench GitHub"),
    ],
    shortAssessment:
      "第一优先级。SpecRLBench 第一作者，是 Dependable Computing Lab 最适合先联系的 Benchmark 构建对象。",
    researchTopics: ["Benchmark", "Safe Reinforcement Learning", "Temporal Logic"],
    secondaryTopics: ["Formal Methods", "Embodied Evaluation", "Robot Planning"],
    representativeProjects: [
      "SpecRLBench",
      "GenZ-LTL",
      "Constraint-Conditioned Actor-Critic",
      "Temporal Logic Specification-Conditioned Decision Transformer",
    ],
    representativePublications: [
      {
        title: "SpecRLBench: A Benchmark for Generalization in Specification-Guided Reinforcement Learning",
        year: "2026",
        venue: "arXiv / under review",
        url: "https://arxiv.org/abs/2604.24729",
        summary:
          "面向 specification-guided reinforcement learning 泛化能力的 Benchmark，包含 navigation、manipulation、单/多智能体、视觉和 RGB-D 等变体。",
      },
      {
        title: "Temporal Logic Specification-Conditioned Decision Transformer for Offline Safe Reinforcement Learning",
        year: "2024",
        venue: "ICML",
        url: "https://proceedings.mlr.press/v235/guo24j.html",
        summary:
          "把 Signal Temporal Logic 作为任务和安全要求输入 Decision Transformer，在离线安全强化学习基准上评测。",
      },
    ],
    benchmarks: ["SpecRLBench", "DSRL", "GenZ-LTL"],
    robotPlatforms: ["Point", "Car", "Ant", "7-DoF Panda", "Safety-Gymnasium", "panda-gym"],
    researchMode: "仿真 + Benchmark",
    whyImportant:
      "他最可能知道 SpecRLBench 为什么建立、当前缺陷、下一版扩展计划和数据/任务生成中最耗时的环节。",
    zodaRelevance:
      "可直接讨论 ZODA 是否能支持大规模任务生成、人工审核、真实场景、多模态观察、评测服务器和 Challenge。",
    potentialDataNeed:
      "真实任务模板、语言指令、RGB-D/视频观察、真实物体语义、长程组合任务、安全失败轨迹和难度分层。",
    benchmarkValue:
      "最适合作为 SpecRLBench-Embodied 或 Natural Language ↔ Formal Specification Benchmark 的入口。",
    networkValue:
      "可连接 İlker Işık、Sabbir Ahmad 和 Wenchao Li，并帮助判断是否值得升级联系 PI。",
    recommendedApproach:
      "第一轮联系聚焦 SpecRLBench 当前局限和下一版扩展需求，不泛泛问是否缺数据。",
    interviewQuestions:
      "SpecRLBench 下一版最想扩展哪些环境、任务类型、自然语言接口和评测基础设施？数据生成和人工审核中最耗时的是哪一环？",
    priority: "S",
    researchStatus: "待联系",
    contactStatus: "待批准联系",
    isStarred: true,
    flags: ["重点关注", "近期联系", "潜在合作对象"],
    tags: ["BU", "Benchmark Author", "SpecRLBench", "Safe RL", "Formal Specification"],
    nextAction: "为 Zijian Guo 建立第一封联系提纲，并单独精读 SpecRLBench。",
    managerNote:
      "第一个联系对象。目标是确认 SpecRLBench 的真实扩展缺口：任务、模态、语言、真实度、leaderboard 和 Challenge。",
    followUpDate: "2026-08-06",
    advisorIds: ["wenchao-li"],
    collaboratorIds: ["ilker-isik", "sabbir-ahmad"],
    createdAt: "2026-08-03",
    updatedAt: "2026-08-03",
    lastModifiedAt: "2026-08-03 16:30",
    lastVerifiedAt: "2026-08-03",
    sources: [
      source("Zijian Guo personal website", "https://ja4822.github.io/zijianguo.github.io/"),
      source("SpecRLBench arXiv", "https://arxiv.org/abs/2604.24729"),
      source("SpecRLBench GitHub", "https://github.com/BU-DEPEND-Lab/SpecRLBench"),
      source("GenZ-LTL project page", "https://bu-depend-lab.github.io/GenZ-LTL/"),
    ],
  }),
  basePerson({
    id: "ilker-isik",
    name: "İlker Işık",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Dependable Computing Lab",
    department: "Electrical and Computer Engineering",
    bio: "BU ECE 博士生，研究形式化推理、神经符号 AI、开放词汇和结构泛化，是 SpecRLBench 与 GenZ-LTL 共同作者。",
    currentResearchFocus:
      "任务规格表示、LTL 泛化、开放词汇、结构泛化与 symbol-invariant model design。",
    contacts: [
      contact("邮箱", "iilker@bu.edu"),
      contact("主页", "https://necrashter.github.io/", "个人主页"),
    ],
    shortAssessment:
      "第二优先级。偏方法和表示，可回答规格如何生成、难度如何控制、模型是否真的理解规则。",
    researchTopics: ["Neuro-symbolic AI", "Temporal Logic", "Formal Methods"],
    secondaryTopics: ["Benchmark", "AI Safety", "Embodied Evaluation"],
    representativeProjects: ["SpecRLBench", "GenZ-LTL", "Symbol-Invariant Transformer"],
    researchMode: "仿真 + 形式化规格",
    whyImportant:
      "对下一代 Benchmark 的自然语言到形式化规格、开放词汇和抗模板记忆设计有价值。",
    zodaRelevance:
      "可帮助设计物体/区域/变量重命名、新符号、新任务结构和中英文指令等抗数据污染评测。",
    potentialDataNeed:
      "不同表面表达但等价逻辑结构的任务指令、变量重命名样本、开放词汇任务规格和人工审核标签。",
    benchmarkValue:
      "适合参与 Natural Language ↔ Formal Specification Benchmark 与 neuro-symbolic generalization 测试。",
    networkValue:
      "可补充 Zijian 的 Benchmark 工程视角，帮助判断语言接口和形式化规格扩展是否可行。",
    recommendedApproach:
      "在联系 Zijian 后作为第二位推进，重点问 LTL 规格生成、难度控制和自然语言接口。",
    interviewQuestions:
      "如何防止模型依赖模板或 token？自然语言指令到 LTL/STL 规格时，哪些歧义最容易导致评测失真？",
    priority: "A",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["重点关注", "潜在合作对象"],
    tags: ["BU", "SpecRLBench", "Formal Specification"],
    nextAction: "等待 Zijian 反馈后，围绕自然语言接口和结构泛化补一轮问题。",
    advisorIds: ["wenchao-li"],
    collaboratorIds: ["zijian-guo", "sabbir-ahmad"],
    createdAt: "2026-08-03",
    updatedAt: "2026-08-03",
    lastModifiedAt: "2026-08-03 16:30",
    lastVerifiedAt: "2026-08-03",
    sources: [
      source("İlker Işık personal website", "https://necrashter.github.io/"),
      source("Dependable Computing Laboratory People", "https://sites.bu.edu/depend/people/"),
      source("GenZ-LTL project page", "https://bu-depend-lab.github.io/GenZ-LTL/"),
    ],
  }),
  basePerson({
    id: "roberto-tron",
    name: "Roberto Tron",
    degree: "PhD",
    role: "Professor",
    title: "Associate Professor",
    lab: "Collaborative Autonomy Group",
    department: "Mechanical Engineering",
    bio: "研究方向包括机器人、控制、几何方法和分布式自主系统。",
    currentResearchFocus: "分布式机器人系统、控制和几何方法。",
    researchTopics: ["Multi-Robot Systems", "Control Systems", "Robot Planning"],
    secondaryTopics: ["Autonomous Navigation"],
    whyImportant: "有助于连接机器人理论、控制和自主系统方向。",
    priority: "中",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["信息待核验"],
    tags: ["BU", "Multi-Robot"],
    collaboratorIds: ["alyssa-pierson"],
  }),
  basePerson({
    id: "sheila-russo",
    name: "Sheila Russo",
    degree: "PhD",
    role: "Professor",
    title: "Associate Professor",
    lab: "Material Robotics Laboratory",
    department: "Mechanical Engineering",
    bio: "研究方向包括医疗机器人、软体机器人和材料驱动机器人。",
    currentResearchFocus: "医疗机器人和软体机器人机构。",
    researchTopics: ["Surgical Robotics", "Soft Robotics", "Robot Manipulation"],
    secondaryTopics: ["Human-Robot Interaction"],
    researchMode: "真实机器人",
    whyImportant: "对手术机器人和材料机器人方向有价值。",
    priority: "中",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["潜在合作对象"],
    tags: ["BU", "Manipulation"],
  }),
  basePerson({
    id: "tommaso-ranzani",
    name: "Tommaso Ranzani",
    degree: "PhD",
    role: "Professor",
    title: "Associate Professor",
    lab: "Material Robotics Laboratory",
    department: "Mechanical Engineering",
    bio: "研究方向包括软体机器人、仿生系统和机器人操作。",
    currentResearchFocus: "软体与仿生机器人系统。",
    researchTopics: ["Soft Robotics", "Robot Manipulation", "Surgical Robotics"],
    secondaryTopics: ["Sim-to-Real"],
    researchMode: "真实机器人",
    priority: "中",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["信息待核验"],
    tags: ["BU", "Manipulation"],
    collaboratorIds: ["andrew-sabelhaus", "sheila-russo"],
  }),
  basePerson({
    id: "akua-dickson",
    name: "Akua Dickson",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Collaborative Autonomy Group",
    department: "Mechanical Engineering",
    researchTopics: ["Multi-Robot Systems", "Human-Robot Interaction"],
    secondaryTopics: ["Robot Planning"],
    priority: "中",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    tags: ["BU", "Multi-Robot"],
    advisorIds: ["alyssa-pierson"],
  }),
  basePerson({
    id: "sabbir-ahmad",
    name: "H. M. Sabbir Ahmad",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Dependable Computing Lab",
    department: "Systems Engineering",
    bio: "BU Systems Engineering 五年级博士生，研究 Safe RL、Control Barrier Function、最优控制、CPS 安全、自动驾驶网络攻击和信任感知控制。",
    currentResearchFocus:
      "Safe RL、CBF 安全控制、动态环境、扰动与故障恢复评测。",
    contacts: [
      contact("邮箱", "sabbir92@bu.edu"),
      contact("主页", "https://sabbirahmad26.github.io/", "个人主页"),
      contact("主页", "https://bu-depend-lab.github.io/HMARL-CBF/", "HMARL-CBF"),
    ],
    shortAssessment:
      "安全评测负责人。优先级 A-，联系时不要主打多智能体协作，应聚焦安全指标、动态环境和故障恢复。",
    researchTopics: ["Safe Reinforcement Learning", "AI Safety", "Control Systems"],
    secondaryTopics: ["Temporal Logic", "Benchmark", "Autonomous Navigation"],
    representativeProjects: ["SpecRLBench", "GenZ-LTL", "HMARL-CBF"],
    benchmarks: ["SpecRLBench", "MetaDrive"],
    researchMode: "仿真 + 安全控制",
    whyImportant:
      "能把安全要求转化为连续控制指标，包括最小安全距离、违规次数/持续时间和 safety controller 介入频率。",
    zodaRelevance:
      "可支撑 Safe VLA Benchmark、安全反例与失败轨迹数据集、动态环境扰动恢复等中期合作方向。",
    potentialDataNeed:
      "安全违规轨迹、动态障碍、人类干扰、传感扰动、通信异常、恢复路径和反事实修正标签。",
    benchmarkValue:
      "适合定义 Task Success + Specification Satisfaction + Safety Violation + Recovery + Efficiency 的组合指标。",
    networkValue:
      "与 Wenchao Li、Christos Cassandras 和 MIT Chuchu Fan 等安全控制网络有关。",
    recommendedApproach:
      "作为第三推进对象，围绕安全指标和动态环境问具体可扩展点，避免把重点放在多车协同。",
    interviewQuestions:
      "安全控制器介入频率、恢复能力和效率损失应该如何标准化评测？哪些扰动最适合从仿真扩展到具身任务？",
    priority: "A",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["重点关注", "潜在合作对象"],
    tags: ["BU", "SpecRLBench", "Safe RL"],
    nextAction: "在 SpecRLBench 方向确认后，补安全指标和动态扰动问题清单。",
    advisorIds: ["wenchao-li"],
    collaboratorIds: ["zijian-guo", "ilker-isik"],
    createdAt: "2026-08-03",
    updatedAt: "2026-08-03",
    lastModifiedAt: "2026-08-03 16:30",
    lastVerifiedAt: "2026-08-03",
    sources: [
      source("Sabbir Ahmad personal website", "https://sabbirahmad26.github.io/"),
      source("HMARL-CBF project page", "https://bu-depend-lab.github.io/HMARL-CBF/"),
      source("SpecRLBench arXiv", "https://arxiv.org/abs/2604.24729"),
    ],
  }),
  basePerson({
    id: "chenyu-wang",
    name: "Chenyu Wang",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Dependable Computing Lab",
    department: "Electrical and Computer Engineering",
    bio: "BU ECE 博士生，与 Kayhan Batmanghelich 联合指导，方向包括 VLM、不确定性量化和可解释 AI。",
    currentResearchFocus:
      "Explainable AI、Uncertainty Quantification、VLM，以及事实性和语义一致性不确定性。",
    contacts: [
      contact("邮箱", "chyuwang@bu.edu"),
      contact("主页", "https://sites.bu.edu/depend/people/", "Depend Lab People"),
    ],
    shortAssessment:
      "条件性保留。当前成果不在 SpecRLBench 或机器人安全主线，适合未来转向 VLM/VLA 不确定性和安全拒绝时再推进。",
    researchTopics: ["AI Safety", "Neuro-symbolic AI", "Embodied Evaluation"],
    secondaryTopics: ["Vision-Language-Action", "Benchmark"],
    representativeProjects: ["Uncertainty Quantification for VLM / report generation"],
    researchMode: "多模态模型评测",
    whyImportant:
      "可延伸到 VLA 动作预测不确定性、模型何时拒绝行动、感知不确定时的保守策略和 hallucinated object 安全评测。",
    zodaRelevance:
      "当前不是第一批联系对象，但适合作为多模态安全、VLA 不确定性和 hallucination 评测的备选。",
    potentialDataNeed:
      "不确定性感知、多模态 hallucination、安全拒绝、错误场景理解和保守行动策略的标注样本。",
    benchmarkValue:
      "可作为 Safe VLA Benchmark 的模型不确定性模块补充，不作为 SpecRLBench 主线联系人。",
    networkValue:
      "连接 Depend Lab 与多模态模型安全评测方向。",
    recommendedApproach:
      "暂不联系；等项目转向 VLM/VLA 不确定性、安全拒绝或多模态 hallucination 时再推进。",
    interviewQuestions:
      "VLA 在感知不确定或对象理解错误时，哪些拒绝/求助/保守动作指标最值得评测？",
    priority: "B",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    flags: ["信息待核验"],
    tags: ["BU"],
    nextAction: "作为多模态安全方向备选保留，暂不进入第一轮联系。",
    advisorIds: ["wenchao-li"],
    createdAt: "2026-08-03",
    updatedAt: "2026-08-03",
    lastModifiedAt: "2026-08-03 16:30",
    lastVerifiedAt: "2026-08-03",
    sources: [
      source("Dependable Computing Laboratory People", "https://sites.bu.edu/depend/people/"),
    ],
  }),
  basePerson({
    id: "kamran-vakil",
    name: "Kamran Vakil",
    role: "PhD Student",
    title: "PhD Student",
    lab: "H2X Lab",
    department: "Electrical and Computer Engineering",
    researchTopics: ["Embodied AI", "Robot Learning"],
    secondaryTopics: ["Vision-Language-Action"],
    priority: "高",
    researchStatus: "跟进中",
    contactStatus: "计划联系",
    flags: ["近期联系"],
    tags: ["BU", "VLA"],
    advisorIds: ["eshed-ohn-bar"],
    createdAt: "2026-07-15",
  }),
  basePerson({
    id: "brennan-brodt",
    name: "Brennan Brodt",
    role: "PhD Student",
    title: "PhD Student",
    lab: "Soft Robotics Control Lab",
    department: "Mechanical Engineering",
    researchTopics: ["Soft Robotics", "Control Systems"],
    priority: "低",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    tags: ["BU"],
    advisorIds: ["andrew-sabelhaus"],
    managerNote: "请补充他的具体项目和是否有公开机器人平台。",
    createdAt: "2026-07-16",
  }),
  basePerson({
    id: "meredith-anderson",
    name: "Meredith Anderson",
    role: "PhD Student",
    title: "PhD Student",
    lab: "RASTIC",
    department: "Electrical and Computer Engineering",
    researchTopics: ["Formal Methods", "Embodied Evaluation"],
    priority: "未评估",
    researchStatus: "待调研",
    contactStatus: "暂不联系",
    tags: ["BU", "Benchmark Author"],
    advisorIds: ["wenchao-li"],
  }),
];

export const seedActivities: ActivityLog[] = [
  {
    id: "activity-20260803-1",
    actor: "Eric",
    actorRole: "Admin",
    action: "新增资料",
    targetType: "organization",
    targetId: "dependable-computing-lab",
    summary:
      "Eric 根据 Dependable Computing Lab 深度调研补充了 SpecRLBench 相关组织和核心成员。",
    createdAt: "2026-08-03 16:30",
  },
  {
    id: "activity-1",
    actor: "Eric",
    actorRole: "Admin",
    action: "新增人员",
    targetType: "person",
    targetId: "alyssa-pierson",
    summary: "Eric 新增了 Alyssa Pierson，并标记为高。",
    createdAt: "2026-07-16 15:00",
  },
  {
    id: "activity-2",
    actor: "Supervisor",
    actorRole: "Editor",
    action: "更新管理备注",
    targetType: "person",
    targetId: "alyssa-pierson",
    summary: "上级要求优先确认 Alyssa Pierson 团队的真实机器人数据或多机器人 benchmark。",
    createdAt: "2026-07-16 15:12",
  },
  {
    id: "activity-3",
    actor: "Eric",
    actorRole: "Admin",
    action: "更新状态",
    targetType: "person",
    targetId: "kamran-vakil",
    summary: "Eric 将 Kamran Vakil 调整为高和计划联系。",
    createdAt: "2026-07-16 15:20",
  },
  {
    id: "activity-4",
    actor: "Supervisor",
    actorRole: "Editor",
    action: "更新管理备注",
    targetType: "person",
    targetId: "brennan-brodt",
    summary: "上级要求补充 Brennan Brodt 的项目和机器人平台信息。",
    createdAt: "2026-07-16 15:25",
  },
];

export const seedUpdates: WorkUpdate[] = [
  {
    id: "update-20260803-1",
    updateType: "新增研究判断",
    title: "补充 Dependable Computing Lab 与 SpecRLBench 线索",
    summary:
      "新增 Dependable Computing Lab 组织卡，并补充 Zijian Guo、İlker Işık、H. M. Sabbir Ahmad、Chenyu Wang 及 Wenchao Li 的 Benchmark / Safe RL / formal specification 判断。",
    insight:
      "Dependable Computing Lab 的核心价值不是大规模真实机器人数据，而是把复杂任务、安全要求和时间顺序转化为可计算、可验证、可复现的 Benchmark；第一联系对象应为 SpecRLBench 第一作者 Zijian Guo。",
    linkedPersonId: "zijian-guo",
    linkedPerson: "Zijian Guo",
    linkedOrganization: "Dependable Computing Lab",
    feishuUrl: "https://example.feishu.cn/docx/zijian-guo",
    author: "Eric",
    occurredAt: "2026-08-03 16:30",
    createdAt: "2026-08-03 16:30",
    updatedAt: "2026-08-03 16:30",
  },
  {
    id: "update-20260717-1",
    updateType: "新增研究判断",
    title: "确认 BU 多机器人方向优先看 Alyssa Pierson",
    summary: "整理 Collaborative Autonomy Group 的研究方向后，认为其与多机器人自主、人机协作和真实机器人数据需求有直接关系。",
    insight: "建议作为第一批高优先级对象保留，下一步重点看是否有可复用 benchmark 或多机器人实验数据。",
    linkedPersonId: "alyssa-pierson",
    linkedPerson: "Alyssa Pierson",
    linkedOrganization: "Collaborative Autonomy Group",
    feishuUrl: "https://example.feishu.cn/docx/alyssa-pierson",
    author: "Eric",
    occurredAt: "2026-07-17 10:20",
    createdAt: "2026-07-17 10:20",
    updatedAt: "2026-07-17 10:20",
  },
  {
    id: "update-20260717-2",
    updateType: "新增资料",
    title: "补充 H2X Lab 人物资料入口",
    summary: "将 Eshed Ohn-Bar 和 Kamran Vakil 相关资料统一挂到飞书人物文档，便于后续继续补项目和学生关系。",
    insight: "H2X Lab 与具身感知和 VLA 方向相关度高，建议继续补齐代表项目。",
    linkedPersonId: "eshed-ohn-bar",
    linkedPerson: "Eshed Ohn-Bar",
    linkedOrganization: "H2X Lab",
    feishuUrl: "https://example.feishu.cn/docx/eshed-ohn-bar",
    author: "Eric",
    occurredAt: "2026-07-17 11:05",
    createdAt: "2026-07-17 11:05",
    updatedAt: "2026-07-17 11:05",
  },
  {
    id: "update-20260716-1",
    updateType: "新增人员",
    title: "新增 BU 软体机器人方向人员",
    summary: "录入 Andrew Sabelhaus，并关联 Soft Robotics Control Lab 作为后续 Physical AI 对象池的一部分。",
    insight: "该方向更偏真实机器人系统和控制，可作为具身硬件侧补充样本。",
    linkedPersonId: "andrew-sabelhaus",
    linkedPerson: "Andrew Sabelhaus",
    linkedOrganization: "Soft Robotics Control Lab",
    feishuUrl: "https://example.feishu.cn/docx/andrew-sabelhaus",
    author: "Eric",
    occurredAt: "2026-07-16 16:10",
    createdAt: "2026-07-16 16:10",
    updatedAt: "2026-07-16 16:10",
  },
  {
    id: "update-20260716-2",
    updateType: "新增实验室",
    title: "新增 RASTIC 实验室线索",
    summary: "将 Wenchao Li 的 RASTIC 纳入列表，作为可信自主系统和具身评测相关的实验室线索。",
    insight: "形式化方法本身不是机器人主线，但对具身评测、安全验证有补充价值。",
    linkedPersonId: "wenchao-li",
    linkedPerson: "Wenchao Li",
    linkedOrganization: "RASTIC",
    feishuUrl: "https://example.feishu.cn/docx/wenchao-li",
    author: "Eric",
    occurredAt: "2026-07-16 15:35",
    createdAt: "2026-07-16 15:35",
    updatedAt: "2026-07-16 15:35",
  },
  {
    id: "update-20260715-1",
    updateType: "完成信息核验",
    title: "核验 BU H2X Lab 公开信息",
    summary: "核验实验室主页、人员身份和研究方向描述，确认其适合作为具身智能感知方向观察对象。",
    insight: "先不急于联系，继续补代表项目和数据来源。",
    linkedPersonId: "eshed-ohn-bar",
    linkedPerson: "Eshed Ohn-Bar",
    linkedOrganization: "H2X Lab",
    feishuUrl: "https://example.feishu.cn/docx/eshed-ohn-bar",
    author: "Eric",
    occurredAt: "2026-07-15 18:00",
    createdAt: "2026-07-15 18:00",
    updatedAt: "2026-07-15 18:00",
  },
  {
    id: "update-20260714-1",
    updateType: "完成人物调研",
    title: "完成 Andrew Sabelhaus 初步人物调研",
    summary: "整理其软体机器人控制方向、实验室定位和可关联学生线索。",
    insight: "适合作为 Physical AI 硬件/控制侧样本，不作为第一批联系对象。",
    linkedPersonId: "andrew-sabelhaus",
    linkedPerson: "Andrew Sabelhaus",
    linkedOrganization: "Soft Robotics Control Lab",
    feishuUrl: "https://example.feishu.cn/docx/andrew-sabelhaus",
    author: "Eric",
    occurredAt: "2026-07-14 17:15",
    createdAt: "2026-07-14 17:15",
    updatedAt: "2026-07-14 17:15",
  },
];

export const seedDashboardBrief: DashboardBrief = {
  title: "BU 具身智能科研对象池建设",
  description:
    "正在梳理 BU 相关教授、博士、硕士和实验室，重点关注 VLA、多机器人、机器人操作、真实机器人数据与可验证 Benchmark。\n\n最新补充：Dependable Computing Lab 更适合作为 SpecRLBench / Safe RL / formal specification 方向的 Benchmark 合作线索，第一联系对象建议为 Zijian Guo。",
  focusAreas: ["VLA", "真实机器人数据", "SpecRLBench", "Safe RL", "Formal Specification"],
  updatedAt: "2026-08-03 16:30",
  updatedBy: "Eric",
};

export const seedNextSteps: NextStep[] = [
  {
    id: "next-step-1",
    content: "为 Zijian Guo 准备第一封联系提纲，并单独精读 SpecRLBench。",
    completed: false,
    sortOrder: 1,
    createdAt: "2026-08-03 16:30",
    updatedAt: "2026-08-03 16:30",
  },
  {
    id: "next-step-2",
    content: "整理 SpecRLBench-Embodied 可扩展任务：真实物体、RGB-D/视频、语言指令和长程组合任务。",
    completed: false,
    sortOrder: 2,
    createdAt: "2026-08-03 16:30",
    updatedAt: "2026-08-03 16:30",
  },
  {
    id: "next-step-3",
    content: "把 İlker Işık 和 Sabbir Ahmad 的问题清单拆成形式化规格与安全指标两条支线。",
    completed: false,
    sortOrder: 3,
    createdAt: "2026-08-03 16:30",
    updatedAt: "2026-08-03 16:30",
  },
];

export const seedOrganizations: ResearchOrganization[] = [
  {
    id: "dependable-computing-lab",
    name: "Dependable Computing Lab",
    type: "实验室",
    priority: "A",
    websiteUrl: "https://sites.bu.edu/depend/people/",
    note:
      "Wenchao Li 领导的 BU 实验室，主线为 specification-guided learning、Safe RL、Temporal Logic、neuro-symbolic generalization 与安全关键自主系统。已有 SpecRLBench，适合作为可验证具身 Benchmark、自然语言到形式化规格和 Safe VLA 评测合作线索；第一联系对象建议为 Zijian Guo。",
    sourceCount: 0,
    createdAt: "2026-08-03 16:30",
    updatedAt: "2026-08-03 16:30",
  },
  {
    id: "h2x-lab",
    name: "H2X Lab",
    type: "实验室",
    priority: "S",
    websiteUrl: "",
    note: "BU 具身感知、VLA、自动驾驶评测和真实环境泛化方向的重点实验室线索。当前重点关联 Eshed Ohn-Bar、Kamran Vakil 及 H2X 学生网络。",
    sourceCount: 0,
    createdAt: "2026-07-17 11:05",
    updatedAt: "2026-07-17 11:05",
  },
  {
    id: "collaborative-autonomy-group",
    name: "Collaborative Autonomy Group",
    type: "实验室",
    priority: "B",
    websiteUrl: "",
    note: "Alyssa Pierson 领导的多机器人协作、自主规划、人机协作和异构机器人团队研究线索。适合作为多机器人 Benchmark 与产业连接的重点组织。",
    sourceCount: 0,
    createdAt: "2026-07-17 11:05",
    updatedAt: "2026-07-17 11:05",
  },
];

export const seedResearchPoolState: ResearchPoolState = {
  people: seedPeople,
  organizations: seedOrganizations,
  activities: seedActivities,
  updates: seedUpdates,
  dashboardBrief: seedDashboardBrief,
  nextSteps: seedNextSteps,
};
