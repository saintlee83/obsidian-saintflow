import assert from "node:assert/strict";
import { it } from "node:test";
import type { App } from "obsidian";
import { pickOne } from "../src/ui/modals";
import { choiceModals } from "./obsidian-mock";

it("selection survives Obsidian closing the modal before onChooseItem", async () => {
	const choice = { label: "Project", value: "project" };
	const result = pickOne({} as App, [choice], "Choose");
	const modal = choiceModals.pop()!;
	modal.onClose();
	modal.onChooseItem(choice);
	assert.equal(await result, "project");
});

it("closing a choice without selecting resolves to null", async () => {
	const result = pickOne({} as App, [{ label: "Project", value: "project" }], "Choose");
	choiceModals.pop()!.onClose();
	assert.equal(await result, null);
});
