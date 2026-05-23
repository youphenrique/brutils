<script setup lang="ts">
import { computed } from "vue";
import { cpf, type CpfValidateResult } from "@brutils/core";

const model = defineModel<string>({ default: "" });

const value = computed(() => cpf.formatAsYouType(model.value ?? ""));

const emit = defineEmits<{
  validate: [result: CpfValidateResult];
}>();

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  model.value = cpf.normalize(target.value);
}

function onBlur() {
  emit("validate", cpf.validate(model.value ?? ""));
}
</script>

<template>
  <input type="text" :value="value" @input="onInputChange" @blur="onBlur" />
</template>
