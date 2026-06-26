<script setup lang="ts">
import testimonialData from '~/../test-db/testimonial-db.json'
</script>

<template>
  <section class="py-16 md:py-24 bg-mist-1/30 relative z-10">
    <div class="mx-auto max-w-6xl px-6">
      <div class="text-center mb-16">
        <h2 class="text-ink text-3xl sm:text-4xl font-extrabold tracking-tight">Don't just take our word for it</h2>
        <p class="mt-4 text-ink-soft text-lg max-w-2xl mx-auto">Hear from past participants, mentors, and partners who have experienced the BICTA magic firsthand.</p>
      </div>

      <div class="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        <div 
          v-for="item in testimonialData" 
          :key="item.id" 
          class="break-inside-avoid bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-line/40 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 duration-300"
        >
          <div class="flex items-center gap-4 mb-4">
            <img :src="item.avatar" :alt="item.name" class="w-12 h-12 rounded-full object-cover ring-4 ring-mist-1" loading="lazy" />
            <div>
              <h3 class="font-bold text-ink">{{ item.name }}</h3>
              <p class="text-[11px] text-brand-600 font-bold uppercase tracking-wider mt-0.5">{{ item.role }}</p>
            </div>
          </div>
          <p class="text-ink-soft leading-relaxed text-sm">
            "{{ item.content }}"
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
