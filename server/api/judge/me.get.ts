export default defineEventHandler(async (event) => {
  const judge = await requireJudge(event)
  return judge
})
