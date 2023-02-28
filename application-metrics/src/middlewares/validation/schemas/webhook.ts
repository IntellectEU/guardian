import * as yup from 'yup';
import fieldsValidation from '../fields-validation'

export const webhookSchema = () => {
  const { url } = fieldsValidation
  return yup.object({
    body: yup.object({
      url
    }),
  });
}
