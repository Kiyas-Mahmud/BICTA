import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { announcementSchema } from '../../../utils/validation'

export default updateHandler(schema.announcements, schema.announcements.id, announcementSchema, { richFields: ['body'], entity: 'announcement' })
