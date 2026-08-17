import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.advisors, schema.advisors.id, { entity: 'advisor' })
