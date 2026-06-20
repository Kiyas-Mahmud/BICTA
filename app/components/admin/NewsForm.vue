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
  <form class="max-w-2xl space-y-5" @submit.prevent="emit('submit', { ...form })">
    <div>
      <label class="label">Title</label>
      <input v-model="form.title" class="input" required maxlength="200" />
    </div>
    <div>
      <label class="label">Excerpt <span class="text-ink-faint">(shown in listings)</span></label>
      <textarea v-model="form.excerpt" class="input" rows="2" maxlength="500" />
    </div>
    <div>
      <label class="label">Content</label>
      <AdminRichText v-model="form.content" />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="label">Status</label>
        <select v-model="form.status" class="input">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div>
        <label class="label">Slug <span class="text-ink-faint">(optional)</span></label>
        <input v-model="form.slug" class="input" maxlength="100" />
      </div>
    </div>
    <div>
      <label class="label">Cover image</label>
      <AdminImageUploader v-model="form.coverImage" />
    </div>

    <button type="submit" class="btn-primary" :disabled="saving">
      {{ saving ? 'Saving…' : 'Save article' }}
    </button>
  </form>
</template>
