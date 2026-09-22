export const answers: unknown[] = [];
function answer() { if (!answers.length) throw new Error("Unexpected UI prompt"); return answers.shift(); }
export const pickOne = async () => answer();
export const pickFile = async () => answer();
export const promptRequired = async () => answer();
export const promptText = async () => answer();
export const openForm = async () => answer();
export const confirm = async () => answer();
export const str = (values: Record<string, unknown>, key: string) => String(values[key] ?? "").trim();
export const file = (values: Record<string, unknown>, key: string) => values[key] ?? null;
