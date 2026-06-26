<script setup lang="ts">
import { ref } from 'vue'
import faqData from '~/../test-db/faq-db.json'

const openItem = ref<string | null>(null)

function toggle(id: string) {
  openItem.value = openItem.value === id ? null : id
}
</script>

<template>
  <section class="py-16 md:py-24 relative z-10">
    <div class="mx-auto max-w-2xl px-6">
      <div class="space-y-12">
        <h2 class="text-ink text-center text-4xl font-semibold">Your questions answered</h2>

        <div class="-mx-2 sm:mx-0">
          <div
            v-for="item in faqData"
            :key="item.id"
            class="group"
          >
            <div
              class="peer rounded-xl border-none px-5 py-1 md:px-7 transition-colors"
              :class="{ 'bg-mist-2': openItem === item.id }"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between py-3 text-base font-medium text-ink hover:no-underline focus:outline-none"
                @click="toggle(item.id)"
              >
                <span class="text-left font-bold pr-4">{{ item.question }}</span>
                <Icon 
                  name="lucide:chevron-down" 
                  class="h-5 w-5 shrink-0 text-ink-soft transition-transform duration-300" 
                  :class="{ 'rotate-180': openItem === item.id }"
                />
              </button>
              
              <div
                v-show="openItem === item.id"
                class="pb-4 text-base text-ink-soft leading-relaxed"
              >
                <p>{{ item.answer }}</p>
              </div>
            </div>
            
            <hr 
              class="mx-5 -mb-px group-last:hidden md:mx-7 border-line transition-opacity duration-200" 
              :class="{ 'opacity-0': openItem === item.id }"
            />
          </div>
        </div>

        <p class="text-ink-soft text-center">
          Can't find what you're looking for? Contact our
          <NuxtLink to="#contact" class="text-brand-600 font-medium hover:underline">
            customer support team
          </NuxtLink>
        </p>
      </div>
    </div>
  </section>
</template>
