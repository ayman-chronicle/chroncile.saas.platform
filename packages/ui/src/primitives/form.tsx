"use client";

/*
 * Form — styled native `<form>`.
 *
 *   <Form onSubmit={...} validationErrors={serverErrors}>
 *     <FormField label="Email" ...>
 *       <Input name="email" type="email" isRequired />
 *     </FormField>
 *     <Button type="submit">Submit</Button>
 *   </Form>
 */

import * as React from "react";

import { formVariants } from "./shadcn";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  className?: string;
}

export function Form({ className, children, ...rest }: FormProps) {
  return (
    <form {...rest} className={formVariants({ className })}>
      {children}
    </form>
  );
}
