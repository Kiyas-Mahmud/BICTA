<script setup lang="ts">
export interface NewsFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  status: 'draft' | 'published'
}

const props = defineProps<{ initial?: Partial<NewsFormData>; saving?: boolean }>()
const emit = defineEmits<{ submit: [data: NewsFormData] }>()

const form = reactive<NewsFormData>({
  title: props.initial?.title ?? '',
  slug: props.initial?.slug ?? '',
  excerpt: props.initial?.excerpt ?? '',
  content: props.initial?.content ?? '',
  coverImage: props.initial?.coverImage ?? null,
  status: props.initial?.status ?? 'draft',
})
</script>

<template>
  <!-- Writing surface on the left, publishing controls on the right. -->
  <form class="grid gap-6 xl:grid-cols-[1fr_20rem] xl:items-start" @submit.prevent="emit('submit', { ...form })">
    <div class="min-w-0 space-y-5">
      <div>
        <label class="label" for="nw-title">Title <span class="text-red-600">*</span></label>
        <input
          id="nw-title"
          v-model="form.title"
          class="input !py-3 !text-base font-bold"
          required
          maxlength="200"
          placeholder="Announcing the 2026 edition"
        />
      </div>
      <div>
        <div class="flex items-baseline justify-between gap-2">
          <label class="label" for="nw-excerpt">Excerpt <span class="font-normal text-ink-faint">(shown in listings)</span></label>
          <span class="text-xs tabular-nums text-ink-faint">{{ form.excerpt.length }}/500</span>
        </div>
        <textarea id="nw-excerpt" v-model="form.excerpt" class="input" rows="2" maxlength="500" />
      </div>
      <div>
        <label class="label">Content</label>
        <AdminRichText v-model="form.content" />
      </div>
    </div>

    <aside class="space-y-5 xl:sticky xl:top-24">
      <div class="surface-quiet p-4">
        <h3 class="console-h2 mb-3">Publishing</h3>
        <div class="space-y-4">
          <div>
            <label class="label" for="nw-status">Status</label>
            <select id="nw-status" v-model="form.status" class="input !bg-white">
              <option value="draft">Draft — hidden from the site</option>
              <option value="published">Published — live</option>
            </select>
          </div>
          <div>
            <label class="label" for="nw-slug">Slug <span class="font-normal text-ink-faint">(optional)</span></label>
            <input id="nw-slug" v-model="form.slug" class="input !bg-white font-mono" maxlength="100" />
          </div>
        </div>
      </div>

      <div class="surface-quiet p-4">
        <h3 class="console-h2 mb-3">Cover image</h3>
        <AdminImageUploader v-model="form.coverImage" />
      </div>

      <AdminFormActions :saving="saving" label="Save article" />
    </aside>
  </form>
</template>
