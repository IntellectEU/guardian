import * as yup from 'yup';

const fieldsValidation = {
  url: yup.string().url().required(),
};

export default fieldsValidation;
