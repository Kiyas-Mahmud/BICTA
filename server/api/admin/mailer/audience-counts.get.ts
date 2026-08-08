import { useDb, schema } from '../../../database/client'

// Lets the compose screen show "this reaches N people" before the admin
// commits to a send, for the two audiences that come straight out of the
// database. The custom-list audience needs no server round trip -- its count
// is just how many valid addresses are typed in.
export default defineEventHandler(async (event) => {
  await requireMainAdmin(event)
  const db = useDb()

  const [newsletter, participants] = await Promise.all([
    db.select({ email: schema.newsletterSubscribers.email }).from(schema.newsletterSubscribers),
    db.selectDistinct({ email: schema.participantAccounts.email }).from(schema.participantAccounts),
  ])

  return { newsletter: newsletter.length, participants: participants.length }
})
