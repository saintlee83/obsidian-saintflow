// 공용 입력 UI. 명령은 모두 Promise를 돌려주는 헬퍼만 씁니다.

import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile } from "obsidian";
import { t } from "../i18n";

export interface Choice<T> {
	value: T;
	label: string;
	description?: string;
}

class ChoiceModal<T> extends FuzzySuggestModal<Choice<T>> {
	private choices: Choice<T>[];
	private resolve: (value: T | null) => void;
	private settled = false;

	constructor(app: App, choices: Choice<T>[], placeholder: string, resolve: (value: T | null) => void) {
		super(app);
		this.choices = choices;
		this.resolve = resolve;
		this.setPlaceholder(placeholder);
	}

	getItems(): Choice<T>[] {
		return this.choices;
	}

	getItemText(item: Choice<T>): string {
		return item.description ? `${item.label} ${item.description}` : item.label;
	}

	onChooseItem(item: Choice<T>): void {
		this.settled = true;
		this.resolve(item.value);
	}

	onClose(): void {
		super.onClose();
		// Obsidian closes the suggestion modal before calling onChooseItem.
		// Wait until selection has had a chance to settle the result.
		queueMicrotask(() => { if (!this.settled) this.resolve(null); });
	}
}

export function pickOne<T>(app: App, choices: Choice<T>[], placeholder: string): Promise<T | null> {
	if (choices.length === 0) return Promise.resolve(null);
	return new Promise((resolve) => new ChoiceModal(app, choices, placeholder, resolve).open());
}

export function pickFile(app: App, files: TFile[], placeholder: string): Promise<TFile | null> {
	return pickOne(
		app,
		files.map((f) => ({ value: f, label: f.basename, description: f.parent?.path ?? "" })),
		placeholder
	);
}

class PromptModal extends Modal {
	private value: string;
	private resolve: (value: string | null) => void;
	private settled = false;
	private opts: { title: string; description?: string; placeholder?: string; cta: string; multiline: boolean };

	constructor(
		app: App,
		opts: { title: string; description?: string; placeholder?: string; value?: string; cta?: string; multiline?: boolean },
		resolve: (value: string | null) => void
	) {
		super(app);
		this.value = opts.value ?? "";
		this.resolve = resolve;
		this.opts = {
			title: opts.title,
			description: opts.description,
			placeholder: opts.placeholder,
			cta: opts.cta ?? t("확인"),
			multiline: opts.multiline ?? false,
		};
	}

	onOpen(): void {
		this.setTitle(this.opts.title);
		const { contentEl } = this;
		if (this.opts.description) {
			contentEl.createDiv({ cls: "saintflow-form-note", text: this.opts.description });
		}
		const setting = new Setting(contentEl);
		setting.settingEl.style.borderTop = "none";
		if (this.opts.multiline) {
			setting.addTextArea((ta) => {
				ta.setPlaceholder(this.opts.placeholder ?? "")
					.setValue(this.value)
					.onChange((v) => (this.value = v));
				ta.inputEl.rows = 4;
				ta.inputEl.style.width = "100%";
				window.setTimeout(() => ta.inputEl.focus(), 0);
			});
		} else {
			setting.addText((text) => {
				text.setPlaceholder(this.opts.placeholder ?? "")
					.setValue(this.value)
					.onChange((v) => (this.value = v));
				text.inputEl.style.width = "100%";
				text.inputEl.addEventListener("keydown", (ev: KeyboardEvent) => {
					if (ev.key === "Enter") {
						ev.preventDefault();
						this.submit();
					}
				});
				window.setTimeout(() => text.inputEl.focus(), 0);
			});
		}
		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText(t("취소")).onClick(() => this.close()))
			.addButton((btn) => btn.setButtonText(this.opts.cta).setCta().onClick(() => this.submit()));
	}

	private submit(): void {
		this.settled = true;
		this.resolve(this.value);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.settled) this.resolve(null);
	}
}

export function promptText(
	app: App,
	opts: { title: string; description?: string; placeholder?: string; value?: string; cta?: string; multiline?: boolean }
): Promise<string | null> {
	return new Promise((resolve) => new PromptModal(app, opts, resolve).open());
}

/** 비어 있으면 다시 묻습니다. 필수 입력(완료 조건, 연결 이유)에 씁니다. */
export async function promptRequired(
	app: App,
	opts: { title: string; description?: string; placeholder?: string; value?: string; cta?: string; multiline?: boolean },
	rejectMessage: string
): Promise<string | null> {
	const value = await promptText(app, opts);
	if (value === null) return null;
	if (value.trim() === "") {
		new Notice(rejectMessage);
		return null;
	}
	return value.trim();
}

class ConfirmModal extends Modal {
	private resolve: (value: boolean) => void;
	private settled = false;
	private opts: { title: string; message: string; cta: string; warning: boolean };

	constructor(
		app: App,
		opts: { title: string; message: string; cta?: string; warning?: boolean },
		resolve: (value: boolean) => void
	) {
		super(app);
		this.resolve = resolve;
		this.opts = {
			title: opts.title,
			message: opts.message,
			cta: opts.cta ?? t("확인"),
			warning: opts.warning ?? false,
		};
	}

	onOpen(): void {
		this.setTitle(this.opts.title);
		this.contentEl.createEl("p", { text: this.opts.message });
		new Setting(this.contentEl)
			.addButton((btn) => btn.setButtonText(t("취소")).onClick(() => this.close()))
			.addButton((btn) => {
				btn.setButtonText(this.opts.cta).onClick(() => {
					this.settled = true;
					this.resolve(true);
					this.close();
				});
				if (this.opts.warning) btn.setWarning();
				else btn.setCta();
			});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.settled) this.resolve(false);
	}
}

export function confirm(
	app: App,
	opts: { title: string; message: string; cta?: string; warning?: boolean }
): Promise<boolean> {
	return new Promise((resolve) => new ConfirmModal(app, opts, resolve).open());
}

export type FieldSpec =
	| { kind: "text"; key: string; label: string; description?: string; placeholder?: string; required?: boolean; value?: string }
	| { kind: "textarea"; key: string; label: string; description?: string; placeholder?: string; required?: boolean; value?: string }
	| { kind: "dropdown"; key: string; label: string; description?: string; options: Record<string, string>; value?: string }
	| { kind: "toggle"; key: string; label: string; description?: string; value?: boolean }
	| {
			kind: "link";
			key: string;
			label: string;
			description?: string;
			required?: boolean;
			/** 고를 수 있는 파일. 비어 있으면 안내만 표시합니다. */
			files: TFile[];
			value?: TFile | null;
	  };

export type FormValues = Record<string, string | boolean | TFile | null>;

class FormModal extends Modal {
	private values: FormValues = {};
	private resolve: (value: FormValues | null) => void;
	private settled = false;
	private opts: { title: string; description?: string; fields: FieldSpec[]; cta: string };

	constructor(
		app: App,
		opts: { title: string; description?: string; fields: FieldSpec[]; cta?: string },
		resolve: (value: FormValues | null) => void
	) {
		super(app);
		this.resolve = resolve;
		this.opts = { title: opts.title, description: opts.description, fields: opts.fields, cta: opts.cta ?? t("만들기") };
		for (const field of opts.fields) {
			if (field.kind === "toggle") this.values[field.key] = field.value ?? false;
			else if (field.kind === "link") this.values[field.key] = field.value ?? null;
			else if (field.kind === "dropdown") this.values[field.key] = field.value ?? Object.keys(field.options)[0] ?? "";
			else this.values[field.key] = field.value ?? "";
		}
	}

	onOpen(): void {
		this.setTitle(this.opts.title);
		const { contentEl } = this;
		if (this.opts.description) {
			contentEl.createDiv({ cls: "saintflow-form-note", text: this.opts.description });
		}
		for (const field of this.opts.fields) this.renderField(contentEl, field);
		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText(t("취소")).onClick(() => this.close()))
			.addButton((btn) => btn.setButtonText(this.opts.cta).setCta().onClick(() => this.submit()));
	}

	private renderField(container: HTMLElement, field: FieldSpec): void {
		const setting = new Setting(container).setName(field.label);
		if (field.description) setting.setDesc(field.description);
		switch (field.kind) {
			case "text":
				setting.addText((text) => {
					text.setPlaceholder(field.placeholder ?? "")
						.setValue((field.value as string) ?? "")
						.onChange((v) => (this.values[field.key] = v));
					text.inputEl.addEventListener("keydown", (ev: KeyboardEvent) => {
						if (ev.key === "Enter") {
							ev.preventDefault();
							this.submit();
						}
					});
				});
				break;
			case "textarea":
				setting.addTextArea((ta) => {
					ta.setPlaceholder(field.placeholder ?? "")
						.setValue((field.value as string) ?? "")
						.onChange((v) => (this.values[field.key] = v));
					ta.inputEl.rows = 3;
				});
				break;
			case "dropdown":
				setting.addDropdown((dd) => {
					dd.addOptions(field.options)
						.setValue((this.values[field.key] as string) ?? "")
						.onChange((v) => (this.values[field.key] = v));
				});
				break;
			case "toggle":
				setting.addToggle((tg) =>
					tg.setValue(!!field.value).onChange((v) => (this.values[field.key] = v))
				);
				break;
			case "link": {
				const label = setting.controlEl.createSpan({ cls: "saintflow-link-value" });
				const current = this.values[field.key] as TFile | null;
				label.setText(current ? current.basename : t("없음"));
				setting.addButton((btn) =>
					btn.setButtonText(t("고르기")).onClick(async () => {
						if (field.files.length === 0) {
							new Notice(t("고를 수 있는 노트가 없습니다."));
							return;
						}
						const picked = await pickFile(this.app, field.files, t("{0} 고르기", field.label));
						if (picked) {
							this.values[field.key] = picked;
							label.setText(picked.basename);
						}
					})
				);
				setting.addExtraButton((btn) =>
					btn
						.setIcon("x")
						.setTooltip(t("비우기"))
						.onClick(() => {
							this.values[field.key] = null;
							label.setText(t("없음"));
						})
				);
				break;
			}
		}
	}

	private submit(): void {
		for (const field of this.opts.fields) {
			if (!("required" in field) || !field.required) continue;
			const value = this.values[field.key];
			const empty = field.kind === "link" ? !value : String(value ?? "").trim() === "";
			if (empty) {
				new Notice(t("{0}은(는) 필수입니다.", field.label));
				return;
			}
		}
		this.settled = true;
		this.resolve(this.values);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.settled) this.resolve(null);
	}
}

export function openForm(
	app: App,
	opts: { title: string; description?: string; fields: FieldSpec[]; cta?: string }
): Promise<FormValues | null> {
	return new Promise((resolve) => new FormModal(app, opts, resolve).open());
}

export function str(values: FormValues, key: string): string {
	const v = values[key];
	return typeof v === "string" ? v.trim() : "";
}

export function file(values: FormValues, key: string): TFile | null {
	const v = values[key];
	return v instanceof TFile ? v : null;
}

export function bool(values: FormValues, key: string): boolean {
	return values[key] === true;
}
