// components/forms/category-form.tsx
'use client'

import { DynamicForm } from "@/components/dynamic-form";
import { createCategory } from "@/lib/actions/category";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FormField } from "@/types/form-builder";
import { Container } from "@/components/ui/container";

export default function CategoryFormPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    try {
      let result = await createCategory(data);


      if (result.success) {
        toast({
          title: "Success",
          description: "Category created successfully"
        });

        router.back();
      } else {
        toast({
          title: "Error",
          description: result.message || `Failed to add category`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const formFields: FormField[] = [
    {
      name: "name",
      label: "Category Name",
      type: "text" as const,
      required: true,
      placeholder: "Enter category name",
      uppercase: true,
      colSpan: 2
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      placeholder: "Enter category description (optional)",
      rows: 3,
      colSpan: 2
    },
    {
      name: "status",
      label: "Status",
      type: "select" as const,
      required: true,
      options: [
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" }
      ],
      colSpan: 2
    }
  ];

  const defaultValues = {};

  return (
    <Container>
      <DynamicForm
        title={"Add New Category"}
        description={"Create a new category to organize your content"}
        fields={formFields}
        onSubmit={handleSubmit}
        submitButtonText={"Create Category"}
        defaultValues={defaultValues}
      />
    </Container>
  );
}