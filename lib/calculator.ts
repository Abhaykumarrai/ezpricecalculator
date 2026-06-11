export const PRESETS = {
  basic: 350,
  medium: 400,
  advanced: 500,
} as const;

export type DistributionMode = "perUser" | "overall";

export const DEFAULT_TOTAL_USERS = 10;

export type AiSubFeatureId = "jdGeneration" | "aiSearch" | "conversationalAi";

export interface AiSubFeaturesEnabled extends Record<AiSubFeatureId, boolean> {}

export const DEFAULT_AI_SUB_FEATURES: AiSubFeaturesEnabled = {
  jdGeneration: true,
  aiSearch: true,
  conversationalAi: true,
};

export interface ComponentSetting {
  enabled: boolean;
  price: number;
  quantity: number;
  distribution?: DistributionMode;
  aiSubFeatures?: AiSubFeaturesEnabled;
}

export const DEFAULT_COMPONENTS: Record<ComponentKey, ComponentSetting> = {
  parsing: { enabled: true, price: 1.6, quantity: 300 },
  aiFeatures: {
    enabled: true,
    price: 100,
    quantity: 1,
    distribution: "perUser",
    aiSubFeatures: { ...DEFAULT_AI_SUB_FEATURES },
  },
  bulkEmail: {
    enabled: true,
    price: 0.038,
    quantity: 5000,
    distribution: "perUser",
  },
  xraySearch: { enabled: false, price: 50, quantity: 1 },
  infra: { enabled: true, price: 50, quantity: 1 },
  customerSupport: { enabled: false, price: 10, quantity: 1 },
};

export type PresetKey = keyof typeof PRESETS;
export type ComponentKey = keyof typeof DEFAULT_COMPONENTS;
export type MarginTab = "rupee" | "percent";

export type ComponentsConfig = Record<ComponentKey, ComponentSetting>;

export interface ComponentMeta {
  label: string;
  helper: string;
  hasValue: boolean;
  valueMin?: number;
  valueStep?: number;
  rateLabel: string;
  rateStep: number;
  supportsDistribution: boolean;
  tooltip?: string;
  addable?: boolean;
  unavailableMessage?: string;
}

export const AI_SEARCH_PER_QUERY_COST = 0.17 + 0.1 + 0.00002;
export const JD_GENERATION_COST_INR = 0.53;

export const CONVERSATIONAL_AI_AVG_INPUT_TOKENS = 3000;
export const CONVERSATIONAL_AI_AVG_OUTPUT_TOKENS = 2000;
export const CLAUDE_HAIKU_45_INPUT_USD_PER_MTOK = 1;
export const CLAUDE_HAIKU_45_OUTPUT_USD_PER_MTOK = 5;
export const USD_TO_INR = 84;

export function calcConversationalAiCostInr(): number {
  const inputUsd =
    (CONVERSATIONAL_AI_AVG_INPUT_TOKENS / 1_000_000) *
    CLAUDE_HAIKU_45_INPUT_USD_PER_MTOK;
  const outputUsd =
    (CONVERSATIONAL_AI_AVG_OUTPUT_TOKENS / 1_000_000) *
    CLAUDE_HAIKU_45_OUTPUT_USD_PER_MTOK;
  return Math.round((inputUsd + outputUsd) * USD_TO_INR * 100) / 100;
}

export const CONVERSATIONAL_AI_COST_INR = calcConversationalAiCostInr();

export function calcConversationalChatsFromCredit(creditRs: number): number {
  if (creditRs <= 0 || CONVERSATIONAL_AI_COST_INR <= 0) return 0;
  return Math.floor(creditRs / CONVERSATIONAL_AI_COST_INR);
}

export function calcJdGenerationsFromCredit(creditRs: number): number {
  if (creditRs <= 0 || JD_GENERATION_COST_INR <= 0) return 0;
  return Math.floor(creditRs / JD_GENERATION_COST_INR);
}

export function calcEffectiveAiCreditPerUser(
  creditRs: number,
  distribution: DistributionMode = "perUser",
  totalUsers: number = DEFAULT_TOTAL_USERS
): number {
  if (creditRs <= 0) return 0;
  if (distribution === "overall") {
    return creditRs / Math.max(1, totalUsers);
  }
  return creditRs;
}

export interface AiFeatureDetailRow {
  id: string;
  label: string;
  depth: 0 | 1;
  valueType?: "na" | "jdCount" | "aiSearchCount" | "chatCount";
  rate?: number;
  rateNote?: string;
  countLabel?: string;
  tooltip?: string;
}

export const AI_FEATURE_DETAIL_ROWS: AiFeatureDetailRow[] = [
  {
    id: "jdGeneration",
    label: "JD Generation",
    depth: 0,
    valueType: "jdCount",
    rate: JD_GENERATION_COST_INR,
    rateNote: "per JD",
    countLabel: "JDs",
  },
  {
    id: "aiSearch",
    label: "AI Search",
    depth: 0,
    valueType: "aiSearchCount",
    rate: AI_SEARCH_PER_QUERY_COST,
    rateNote: "per search query",
    countLabel: "search queries",
  },
  {
    id: "conversationalAi",
    label: "Conversational AI",
    depth: 0,
    valueType: "chatCount",
    rate: CONVERSATIONAL_AI_COST_INR,
    rateNote: "per chat",
    countLabel: "chats",
  },
];

const COUNT_CALC_BY_VALUE_TYPE = {
  jdCount: calcJdGenerationsFromCredit,
  aiSearchCount: calcAiSearchesFromCredit,
  chatCount: calcConversationalChatsFromCredit,
} as const;

export function normalizeAiSubFeatures(
  enabled?: Partial<AiSubFeaturesEnabled>
): AiSubFeaturesEnabled {
  return { ...DEFAULT_AI_SUB_FEATURES, ...enabled };
}

export function countEnabledAiSubFeatures(
  enabled: Partial<AiSubFeaturesEnabled> = DEFAULT_AI_SUB_FEATURES
): number {
  const subFeatures = normalizeAiSubFeatures(enabled);
  return AI_FEATURE_DETAIL_ROWS.filter((row) => subFeatures[row.id as AiSubFeatureId])
    .length;
}

export function calcAiSubFeatureCounts(
  creditRs: number,
  distribution: DistributionMode = "perUser",
  totalUsers: number = DEFAULT_TOTAL_USERS,
  enabled: Partial<AiSubFeaturesEnabled> = DEFAULT_AI_SUB_FEATURES
): Record<AiSubFeatureId, number> {
  const subFeatures = normalizeAiSubFeatures(enabled);
  const effectiveCredit = calcEffectiveAiCreditPerUser(
    creditRs,
    distribution,
    totalUsers
  );
  const result: Record<AiSubFeatureId, number> = {
    jdGeneration: 0,
    aiSearch: 0,
    conversationalAi: 0,
  };

  const enabledRows = AI_FEATURE_DETAIL_ROWS.filter(
    (row) => subFeatures[row.id as AiSubFeatureId]
  );
  if (enabledRows.length === 0 || effectiveCredit <= 0) return result;

  const share = effectiveCredit / enabledRows.length;

  for (const row of enabledRows) {
    if (!row.valueType || row.valueType === "na") continue;
    const calc = COUNT_CALC_BY_VALUE_TYPE[row.valueType];
    result[row.id as AiSubFeatureId] = calc(share);
  }

  return result;
}

export function calcAiSearchesFromCredit(creditRs: number): number {
  if (creditRs <= 0) return 0;
  return Math.floor(creditRs / AI_SEARCH_PER_QUERY_COST);
}

function formatTooltipAmount(amount: number): string {
  if (amount < 0.01) return amount.toFixed(5);
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function buildAiSubFeatureTooltip(
  subFeatureId: AiSubFeatureId,
  creditRs: number,
  distribution: DistributionMode = "perUser",
  totalUsers: number = DEFAULT_TOTAL_USERS,
  enabled: Partial<AiSubFeaturesEnabled> = DEFAULT_AI_SUB_FEATURES
): string {
  const subFeatures = normalizeAiSubFeatures(enabled);
  const row = AI_FEATURE_DETAIL_ROWS.find((r) => r.id === subFeatureId);
  if (!row?.rate) return "";

  const users = Math.max(1, totalUsers);
  const effectiveCredit = calcEffectiveAiCreditPerUser(
    creditRs,
    distribution,
    totalUsers
  );
  const enabledCount = countEnabledAiSubFeatures(subFeatures);
  const included = subFeatures[subFeatureId];
  const share = included && enabledCount > 0 ? effectiveCredit / enabledCount : 0;
  const count = calcAiSubFeatureCounts(
    creditRs,
    distribution,
    totalUsers,
    subFeatures
  )[subFeatureId];

  const creditStep =
    distribution === "overall"
      ? `Per-user credit = ₹${formatTooltipAmount(creditRs)} ÷ ${users} users = ₹${formatTooltipAmount(effectiveCredit)}`
      : `Per-user credit = ₹${formatTooltipAmount(effectiveCredit)}`;

  if (!included) {
    return `Not included — no count shown. Unchecking redistributes credit to other checked features. ${creditStep}.`;
  }

  const shareStep = `Your share = ₹${formatTooltipAmount(effectiveCredit)} ÷ ${enabledCount} checked = ₹${formatTooltipAmount(share)}`;
  const countStep = `${row.countLabel} = floor(₹${formatTooltipAmount(share)} ÷ ₹${formatTooltipAmount(row.rate)}) = ${count}`;

  const contextById: Record<AiSubFeatureId, string> = {
    jdGeneration: "Rate: ₹0.53 per JD.",
    aiSearch:
      "Rate: ₹0.27 per search query (Generation ₹0.17 + Extraction ₹0.10 + Embedding ₹0.00002).",
    conversationalAi: `Rate: ₹${formatTooltipAmount(CONVERSATIONAL_AI_COST_INR)} per chat (Claude Haiku 4.5, avg 3k in + 2k out tokens).`,
  };

  return `${contextById[subFeatureId]} ${creditStep}. ${shareStep}. ${countStep}.`;
}

export const AI_SUB_FEATURES = AI_FEATURE_DETAIL_ROWS.filter((r) => r.depth === 0).map(
  (r) => r.label
);

export const COMPONENT_META: Record<ComponentKey, ComponentMeta> = {
  parsing: {
    label: "Parsing",
    helper: "CV parsing volume × rate per CV",
    hasValue: true,
    valueMin: 50,
    valueStep: 10,
    rateLabel: "per/CV",
    rateStep: 0.01,
  },
  aiFeatures: {
    label: "AI Features",
    helper: "JD Generation, AI Search, Conversational AI",
    hasValue: false,
    rateLabel: "Rs Credit",
    rateStep: 1,
    supportsDistribution: true,
  },
  bulkEmail: {
    label: "Bulk Email",
    helper: "Email volume × rate per email",
    hasValue: true,
    valueMin: 1,
    valueStep: 100,
    rateLabel: "per/email",
    rateStep: 0.001,
    supportsDistribution: true,
  },
  xraySearch: {
    label: "X-ray Search",
    helper: "LinkedIn & profile enrichment search",
    hasValue: false,
    rateLabel: "Per User",
    rateStep: 1,
    supportsDistribution: false,
    addable: false,
    unavailableMessage:
      "X-ray Search is in development. Per search price is not defined yet.",
  },
  infra: {
    label: "Infra Cost",
    helper: "AWS hosting & infrastructure",
    hasValue: false,
    rateLabel: "Per User",
    rateStep: 1,
    supportsDistribution: false,
  },
  customerSupport: {
    label: "Customer Support",
    helper: "Dedicated support & onboarding",
    hasValue: false,
    rateLabel: "Per User",
    rateStep: 1,
    supportsDistribution: false,
  },
};

export const COMPONENT_ORDER: ComponentKey[] = [
  "parsing",
  "aiFeatures",
  "bulkEmail",
  "xraySearch",
  "infra",
  "customerSupport",
];

export interface CostBreakdown {
  parsingCost: number;
  aiCost: number;
  bulkEmailCost: number;
  xraySearchCost: number;
  infraCost: number;
  customerSupportCost: number;
  variableCost: number;
}

export function formatRupee(amount: number, decimals?: number): string {
  const d = decimals ?? (Number.isInteger(amount) ? 0 : 2);
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
}

export function componentLineCost(
  key: ComponentKey,
  setting: ComponentSetting,
  totalUsers: number = DEFAULT_TOTAL_USERS
): number {
  if (!setting.enabled) return 0;
  const users = Math.max(1, totalUsers);

  switch (key) {
    case "parsing":
      return setting.quantity * setting.price;
    case "bulkEmail": {
      const total = setting.quantity * setting.price;
      if (setting.distribution === "overall") {
        return total / users;
      }
      return total;
    }
    case "aiFeatures": {
      if (setting.distribution === "overall") {
        return setting.price / users;
      }
      return setting.price;
    }
    case "xraySearch":
    case "infra":
    case "customerSupport":
      return setting.price;
    default:
      return setting.quantity * setting.price;
  }
}

export function calcCosts(
  components: ComponentsConfig,
  totalUsers: number = DEFAULT_TOTAL_USERS
): CostBreakdown {
  const parsingCost = componentLineCost("parsing", components.parsing, totalUsers);
  const aiCost = componentLineCost("aiFeatures", components.aiFeatures, totalUsers);
  const bulkEmailCost = componentLineCost("bulkEmail", components.bulkEmail, totalUsers);
  const xraySearchCost = componentLineCost("xraySearch", components.xraySearch, totalUsers);
  const infraCost = componentLineCost("infra", components.infra, totalUsers);
  const customerSupportCost = componentLineCost(
    "customerSupport",
    components.customerSupport,
    totalUsers
  );
  const variableCost =
    parsingCost +
    aiCost +
    bulkEmailCost +
    xraySearchCost +
    infraCost +
    customerSupportCost;
  return {
    parsingCost,
    aiCost,
    bulkEmailCost,
    xraySearchCost,
    infraCost,
    customerSupportCost,
    variableCost,
  };
}

export function getParsingQuantity(components: ComponentsConfig): number {
  return components.parsing.quantity;
}

export function calcSellPrice(variableCost: number, marginRupee: number): number {
  return variableCost + marginRupee;
}

export function calcGrossMarginPct(sellPrice: number, variableCost: number): number {
  if (sellPrice <= 0) return 0;
  return ((sellPrice - variableCost) / sellPrice) * 100;
}

export function rupeeToMarginPercent(variableCost: number, marginRupee: number): number {
  const sellPrice = calcSellPrice(variableCost, marginRupee);
  return calcGrossMarginPct(sellPrice, variableCost);
}

export function marginPercentToRupee(variableCost: number, marginPercent: number): number {
  if (marginPercent >= 100) return variableCost * 10;
  const sellPrice = variableCost / (1 - marginPercent / 100);
  return sellPrice - variableCost;
}

export function getMarginColorClass(pct: number): "green" | "amber" | "red" {
  if (pct > 15) return "green";
  if (pct >= 10) return "amber";
  return "red";
}

export function matchPreset(quantity: number): PresetKey | null {
  const entry = Object.entries(PRESETS).find(([, v]) => v === quantity);
  return entry ? (entry[0] as PresetKey) : null;
}

export function cloneDefaultComponents(): ComponentsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_COMPONENTS)) as ComponentsConfig;
}

function distributionNote(setting: ComponentSetting, totalUsers: number): string {
  if (setting.distribution !== "overall") return "";
  return ` (÷ ${Math.max(1, totalUsers)} users)`;
}

export function getBreakdownLabel(
  key: ComponentKey,
  setting: ComponentSetting,
  totalUsers: number = DEFAULT_TOTAL_USERS
): string {
  const meta = COMPONENT_META[key];
  if (!setting.enabled) return meta.label;

  const dist = distributionNote(setting, totalUsers);

  if (key === "parsing") {
    return `Parsing (${setting.quantity} CVs × ${formatRupee(setting.price, 2)})`;
  }
  if (key === "bulkEmail") {
    return `Bulk Email (${setting.quantity.toLocaleString("en-IN")} × ₹${setting.price}${dist})`;
  }
  if (key === "aiFeatures") {
    return `AI Features (₹${setting.price} credit${dist})`;
  }
  return meta.label;
}

export function buildCopySummary(params: {
  components: ComponentsConfig;
  marginRupee: number;
  totalUsers?: number;
}): string {
  const { components, marginRupee, totalUsers = DEFAULT_TOTAL_USERS } = params;
  const costs = calcCosts(components, totalUsers);
  const sellPrice = calcSellPrice(costs.variableCost, marginRupee);
  const grossMarginPct = calcGrossMarginPct(sellPrice, costs.variableCost);
  const parsingQty = getParsingQuantity(components);

  const componentLines = COMPONENT_ORDER.map((key) => {
    const meta = COMPONENT_META[key];
    const setting = components[key];
    if (!setting.enabled) return `  ${meta.label}: —`;
    const lineCost = componentLineCost(key, setting, totalUsers);
    return `  ${getBreakdownLabel(key, setting, totalUsers)}: ${formatRupee(lineCost)}`;
  });

  return [
    "ezRecruit Cost Summary",
    "========================",
    "",
    "Configuration:",
    components.parsing.enabled
      ? `  CV Volume: ${parsingQty} CVs/user/mo`
      : "  CV Volume: —",
    "",
    "Per User / Month:",
    ...componentLines,
    `  Variable Cost: ${formatRupee(costs.variableCost)}`,
    `  Margin: ${formatRupee(marginRupee)}`,
    `  Sell Price: ${formatRupee(sellPrice)}`,
    "",
    "Totals:",
    `  Gross Margin: ${grossMarginPct.toFixed(1)}%`,
    `  Monthly Revenue: ${formatRupee(sellPrice)}`,
    `  Monthly Cost: ${formatRupee(costs.variableCost)}`,
    components.parsing.enabled && parsingQty > 0
      ? `  Cost per CV: ${formatRupee(sellPrice / parsingQty, 2)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
