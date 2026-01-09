import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash } from "lucide-react"

interface Props {
  form: UseFormReturn<any>
  disabled?: boolean
}

export function ProductFeatureList({ form, disabled }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "product_details",
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Product Features</label>
        <Button
          type="button"
          size="sm"
          onClick={() => append("")}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Feature
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No features added yet
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...form.register(`product_details.${index}`)}
              placeholder={`Feature ${index + 1}`}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => remove(index)}
              disabled={disabled}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
