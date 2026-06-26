<script setup lang="ts">
import howItWorksData from '~/../test-db/howitworks-db.json'
</script>

<template>
  <section class="py-16 md:py-24 bg-white relative z-10">
    <div class="mx-auto max-w-6xl px-6">
      <div class="text-center mb-16">
        <h2 class="text-ink text-3xl sm:text-4xl font-extrabold tracking-tight">How it works</h2>
        <p class="mt-4 text-ink-soft text-lg max-w-2xl mx-auto">From registration to the final pitch, here is your journey to the national stage.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        <!-- Connecting Line for Desktop -->
        <div class="hidden lg:block absolute top-10 left-[12%] right-[12%] h-px bg-line border-t border-dashed border-line/60" aria-hidden="true"></div>

        <div 
          v-for="(item, index) in howItWorksData" 
          :key="item.id" 
          class="relative flex flex-col items-center text-center group"
        >
          <!-- Icon & Step Badge -->
          <div class="relative mb-6">
            <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-white border-2 border-mist-2 shadow-sm text-brand-600 transition-transform group-hover:scale-110 group-hover:border-brand-200 duration-300 relative z-10">
              <Icon :name="item.icon" class="w-8 h-8" />
            </div>
            <!-- Number Badge -->
            <div class="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white text-xs font-bold ring-4 ring-white z-20">
              {{ item.step }}
            </div>
          </div>
          
          <h3 class="text-lg font-bold text-ink mb-3">{{ item.title }}</h3>
          <p class="text-sm text-ink-soft leading-relaxed px-2">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
