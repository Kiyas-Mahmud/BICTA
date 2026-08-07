import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { eventPrizeSchema } from '../../../utils/validation'

export default updateHandler(schema.eventPrizes, schema.eventPrizes.id, eventPrizeSchema, { entity: 'prize' })
