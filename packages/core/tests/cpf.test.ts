import { describe, expect, it } from "vitest";
import { cpf } from "../src";

describe("cpf.format", () => {
	it("formats valid unformatted CPF", () => {
		expect(cpf.format("12345678909")).toBe("123.456.789-09");
	});

	it("reformats valid formatted CPF", () => {
		expect(cpf.format("123.456.789-09")).toBe("123.456.789-09");
	});

	it("formats partially formatted CPF", () => {
		expect(cpf.format("123.45678909")).toBe("123.456.789-09");
	});

	it("preserves leading zeros", () => {
		expect(cpf.format("00000000191")).toBe("000.000.001-91");
	});

	it("strips whitespace and non-numeric characters", () => {
		expect(cpf.format("  123 456 789 09  ")).toBe("123.456.789-09");
		expect(cpf.format("943.?ABC895.751-04abc")).toBe("943.895.751-04");
	});

	it("handles invalid lengths and empty input", () => {
		expect(cpf.format("")).toBe("");
		expect(cpf.format("9")).toBe("9");
		expect(cpf.format("9438")).toBe("943.8");
		expect(cpf.format("94389575104000000")).toBe("943.895.751-04");
	});

	it("left-pads with zeros when pad option is enabled", () => {
		expect(cpf.format("", { pad: true })).toBe("000.000.000-00");
		expect(cpf.format("9", { pad: true })).toBe("000.000.000-09");
		expect(cpf.format("94389575104", { pad: true })).toBe("943.895.751-04");
	});
});
