import { render } from "vitest-browser-vue";
import { userEvent } from "vite-plus/test/browser";
import { expect, test, describe, vi } from "vite-plus/test";

import CpfInput from "../../src/components/cpf/cpf-input.vue";

describe("<CpfInput /> test suite", () => {
  test("renders an input element", async () => {
    const { getByRole } = await render(CpfInput);

    await expect.element(getByRole("textbox")).toBeInTheDocument();
  });

  test("displays formatted CPF from modelValue prop", async () => {
    const { getByRole } = await render(CpfInput, {
      props: { modelValue: "52263944621" },
    });

    await expect.element(getByRole("textbox")).toHaveValue("522.639.446-21");
  });

  test("formats CPF progressively as the user types", async () => {
    const { getByRole } = await render(CpfInput);

    await userEvent.type(getByRole("textbox"), "522");
    await expect.element(getByRole("textbox")).toHaveValue("522");
    await userEvent.type(getByRole("textbox"), "6");
    await expect.element(getByRole("textbox")).toHaveValue("522.6");
    await userEvent.type(getByRole("textbox"), "3");
    await expect.element(getByRole("textbox")).toHaveValue("522.63");
    await userEvent.type(getByRole("textbox"), "9");
    await expect.element(getByRole("textbox")).toHaveValue("522.639");
    await userEvent.type(getByRole("textbox"), "4");
    await expect.element(getByRole("textbox")).toHaveValue("522.639.4");
    await userEvent.type(getByRole("textbox"), "4");
    await expect.element(getByRole("textbox")).toHaveValue("522.639.44");
    await userEvent.type(getByRole("textbox"), "6");
    await expect.element(getByRole("textbox")).toHaveValue("522.639.446");
    await userEvent.type(getByRole("textbox"), "2");
    await expect.element(getByRole("textbox")).toHaveValue("522.639.446-2");
    await userEvent.type(getByRole("textbox"), "1");
    await expect.element(getByRole("textbox")).toHaveValue("522.639.446-21");
  });

  test("emits normalized digits as modelValue on input", async () => {
    const onUpdate = vi.fn();
    const { getByRole } = await render(CpfInput, {
      props: { "onUpdate:modelValue": onUpdate },
    });

    await userEvent.fill(getByRole("textbox"), "522.639.446-21");

    expect(onUpdate).toHaveBeenLastCalledWith("52263944621");
  });

  test("emits validate with success: true on blur for a valid CPF", async () => {
    const onValidate = vi.fn();
    const { getByRole } = await render(CpfInput, {
      props: { modelValue: "52263944621", onValidate },
    });

    await userEvent.click(getByRole("textbox"));
    await userEvent.tab();

    expect(onValidate).toHaveBeenCalledWith({ success: true, error: null });
  });

  test("emits validate with success: false on blur for an invalid CPF", async () => {
    const onValidate = vi.fn();
    const { getByRole } = await render(CpfInput, {
      props: { modelValue: "00000000000", onValidate },
    });

    await userEvent.click(getByRole("textbox"));
    await userEvent.tab();

    expect(onValidate).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test("updates display when modelValue prop changes", async () => {
    const { getByRole, rerender } = await render(CpfInput, {
      props: { modelValue: "" },
    });

    await rerender({ modelValue: "52263944621" });
    await expect.element(getByRole("textbox")).toHaveValue("522.639.446-21");
  });
});
