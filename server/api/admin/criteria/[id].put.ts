import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { judgingCriterionSchema } from '../../../utils/validation'

export default updateHandler(schema.judgingCriteria, schema.judgingCriteria.id, judgingCriterionSchema, { entity: 'judging criterion' })
