'use client'

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Loading from "@/app/dashboard/loading";
import { useState } from "react";
import { DefaultFormTextArea, DefaultFormTextField } from "@/components/ui/default-form-field";
import { CardContent, CardDescription, CardTitle, CardHeader } from "@/components/ui/card";
import { createCategory } from "@/lib/actions/category";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";


const formScheme = z.object({
  category_name: z.string().min(2, "Add a name").max(255, "Name must be less than 255 characters"),
  category_description: z.string().min(2, "Add a name").max(255, "Name must be less than 255 characters"),
});

export type CategoryFormValues = z.infer<typeof formScheme>;

export default function AddCategory() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const defaultValues: Partial<CategoryFormValues> = {};

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formScheme),
    defaultValues,
  });

  async function onSubmit(data: CategoryFormValues) {

    setLoading(true);
    try {
      const result = await createCategory(data);
      if (result.success) {
        toast({
          title: "Success",
          description: result.result,
        });
        router.back();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <Container>
      <CardHeader>
        <CardTitle>Add User</CardTitle>
        <CardDescription>
          Add a new user to the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="my-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col gap-4">

                <DefaultFormTextField
                  form={form}
                  name="category_name"
                  label="Category Name"
                  placeholder="Enter category name"
                />

                <DefaultFormTextArea
                  form={form}
                  name="category_description"
                  label="Description"
                  placeholder="Enter category description"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Add User</Button>
              </div>
            </form>
          </Form>
        </div>
      </CardContent>
    </Container>
  );
}