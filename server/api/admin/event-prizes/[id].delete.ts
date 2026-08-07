import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.eventPrizes, schema.eventPrizes.id, { entity: 'prize' })
