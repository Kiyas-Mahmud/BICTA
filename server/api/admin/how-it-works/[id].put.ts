import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { howItWorksSchema } from '../../../utils/validation'

export default updateHandler(schema.howItWorksSteps, schema.howItWorksSteps.id, howItWorksSchema)
