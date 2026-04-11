import type { Messages } from "@/lib/i18n/types";

const zhCN: Messages = {
  common: {
    languageName: "中文",
    loading: "加载中",
    back: "返回欢迎页",
    audio: "音频",
    sfx: "音效",
    music: "音乐",
  },
  welcome: {
    heroAlt: "Life Simulator 欢迎页",
    start: "开局",
  },
  life: {
    title: "人生成长",
    round: ({ round }) => `第 ${round} 回合`,
    settled: "已结算",
    inProgress: "进行中",
    tagline: "技能 · 流年 · 叙事",
    createCharacter: {
      title: "创建角色",
      description:
        "进入详情页后，将随机生成八大维度初始值（0–100），每年可先分配技能点再推进剧情。",
      placeholder: "你的名字",
      submit: "开始人生",
    },
    status: {
      title: "角色状态",
      summary: ({ name, age, max }) => `${name} · ${age} 岁 · 上限 ${max} 点 / 维`,
    },
    nextYear: {
      title: "开启下一年",
      gainHint: ({ nextAge, skillBudget, remaining }) =>
        `下一年（${nextAge} 岁）可分配：${skillBudget} 点，剩余 ${remaining} 点。`,
      loseHint: ({ nextAge, remaining }) =>
        `下一年（${nextAge} 岁）需扣除：${remaining} 点，不允许任何维度低于 0。`,
      noneHint: ({ nextAge }) => `下一年（${nextAge} 岁）不获得技能点，直接开启。`,
      start: "开启下一年",
      mustSpend: "先分配完点数",
      mustRemove: "先扣完点数",
      opening: "下一年开启中…",
      openingCaption: "日出日落之间，你又长大了一点点",
      thisYear: "这一年……",
      generating: "叙事生成中",
      next: "下一年",
      commandBarRelocated: "操作已移到底部指令条",
    },
    almanac: {
      title: "年鉴",
      empty: "暂无记录",
      localNarrative: "本地叙事",
      export: "导出存档 JSON",
    },
    gameOver: {
      ended: "人生已落幕",
      badge: "已离世",
      title: "人生落幕",
      subtitle: ({ age }) =>
        `在 ${age} 岁，这一段人生合卷。本次旅程结束，年鉴仍记录着走过的路。`,
      hint: "仍可翻阅年鉴，或导出存档留念。",
      acknowledge: "继续",
      openAlmanac: "打开年鉴",
      roundEnded: "终章",
    },
  },
  errors: {
    streamReadFailed: "无法读取流式响应",
    streamFailed: "流式叙事失败",
    missingFinalState: "未收到完整游戏状态",
    createCharacterFailed: "创建角色失败",
    requestFailed: "请求失败",
    invalidName: "名字需 1–20 字符，支持中文、字母、数字、间隔号",
  },
  stats: {
    happiness: { label: "快乐" },
    health: { label: "健康" },
    wealth: { label: "财富" },
    career: { label: "事业" },
    study: { label: "学业" },
    social: { label: "人际关系" },
    love: { label: "爱情" },
    marriage: { label: "婚姻" },
  },
  events: {
    fallbackBreath: { title: "又混过了一年" },
    brick: { title: "工地搬砖" },
    debut: { title: "被星探递名片" },
    gaokao: { title: "高三，卷子比人高" },
    tagBonusAfterWork: { title: "工头觉得你手速快，多给一盒饭" },
    easterNameLong: { title: "名字够长，算命先生多送半句" },
  },
  narrative: {
    idleLine: "日子还得过。",
    yearLine: ({ name, age, events }) => `${name} 在 ${age} 岁这一年：${events}。`,
    deathYear: ({ name, age }) =>
      `${name} 没能再迎来下一个清晨——在 ${age} 岁，人生在此合卷。本次模拟结束，余下只有年鉴里的字句与回忆。`,
    skillFlavor: {
      happiness: "你把这点心思花在「快乐」上，这一年心里像开了小灯，容易笑出声。",
      health: "你更在意「健康」，作息或心态上悄悄挪了一步，身体少跟你闹别扭。",
      wealth: "你押注在「财富」上，对钱更敏感一点，机会与抠门同时上门。",
      career: "你投资「事业」，职场上多了一点存在感，也多一点背锅风险。",
      study: "你加在「学业」上，脑子多转了几圈，卷子和头发一起变多。",
      social: "你强化「人际关系」，饭局消息变密，人情债也悄悄记账。",
      love: "你把点加在「爱情」上，心动与误会轮流值班，剧情略狗血。",
      marriage: "你关注「婚姻」议题，承诺与琐事同框出现，像开联名账户。",
    },
  },
  llm: {
    roleJson:
      "你是 Life Simulator 的年度旁白，也是嘴上不饶人但心里有数的人生损友。用户会给你 JSON：玩家姓名、年龄、runSeed、当前属性、本年度事件，以及可选的技能倾向。若 lifeStatus 为 deceased，只写克制、体面的离世收尾，不要写未来或下一年。",
    rolePlain: "请根据提供的 JSON 事实，直接写一段 Life Simulator 的年度叙事正文。",
    replyInEnglish: "Reply in English.",
    replyInChinese: "请用中文回复。",
    noLanguageMixing: "正常正文里不要中英夹杂，除非专有名词或技术标识必须保留原文。",
  },
};

export default zhCN;
