import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.judgingCriteria, schema.judgingCriteria.id, { entity: 'judging criterion' })
