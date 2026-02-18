"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { FieldErrors, useFieldArray, useForm } from "react-hook-form"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { workoutApi } from "@/lib/api"
import { ApiErrorHandler } from "@/lib/error-handler"
import { cn } from "@/lib/utils"
import { workoutSchema, type WorkoutFormData } from "@/lib/validations/workout"

interface WorkoutFormProps {
  onSuccess?: () => void
}

export function WorkoutForm({ onSuccess }: WorkoutFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      date: new Date(),
      workoutTime: format(new Date(), "HH:mm"),
      exercises: [
        {
          name: "",
          weight: 0,
          weightUnit: "kg",
          sets: 3,
          reps: [10],
          restTime: 60
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises"
  })

  // Mutation for creating workout
  const { mutate: createWorkout, isPending } = useMutation({
    mutationFn: (data: WorkoutFormData) => mapAndSubmit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] })
      form.reset()
      if (onSuccess) onSuccess()
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      // TODO: Show toast notification with errorMessage
      console.error("Failed to log workout:", errorMessage);
    }
  })

  // Helper handling type conversion if needed (e.g. date to string) api expects types
  const mapAndSubmit = async (data: WorkoutFormData) => {
    // Combine date and time
    const [hours, minutes] = data.workoutTime.split(':').map(Number);
    const combinedDate = new Date(data.date);
    combinedDate.setHours(hours, minutes, 0, 0);

    return workoutApi.create({
      date: combinedDate.toISOString(),
      exercises: data.exercises
    })
  }

  const onSubmit = (data: WorkoutFormData, e?: React.BaseSyntheticEvent) => {
    try {
      e?.preventDefault()
      e?.stopPropagation()
      createWorkout(data)
    } catch (error) {
      console.log("🚀 ~ onSubmit ~ error:", error)
    }
  }

  const onError = (
    errors: FieldErrors<WorkoutFormData>,
    e?: React.BaseSyntheticEvent
  ) => {
    e?.preventDefault()
    e?.stopPropagation()
    console.log("Validation errors:", errors)
    // Optionally show a toast notification for validation errors
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onError)} className='space-y-6'>
      <div className='flex flex-col space-y-2'>
        <Label htmlFor='date'>Workout Date & Time</Label>
        <div className="flex flex-wrap gap-4">
          <Input
            type='date'
            id='date'
            {...form.register("date", { valueAsDate: true })}
            className='w-full md:w-[180px]'
          />
          <Input
            type='time'
            id='workoutTime'
            {...form.register("workoutTime")}
            className='w-full md:w-[120px]'
          />
        </div>
        {(form.formState.errors.date || form.formState.errors.workoutTime) && (
          <p className='text-sm text-destructive'>
            {form.formState.errors.date?.message || form.formState.errors.workoutTime?.message}
          </p>
        )}
      </div>

      <div className='space-y-4'>
        {fields.map((field, index) => (
          <Card key={field.id} className='relative'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive'
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base font-medium'>
                Exercise {index + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <div className='space-y-2 col-span-2'>
                <Label htmlFor={`exercises.${index}.name`}>Values</Label>
                <Input
                  placeholder='e.g. Bench Press'
                  {...form.register(`exercises.${index}.name`)}
                  className={cn(
                    form.formState.errors.exercises?.[index]?.name &&
                    "border-destructive"
                  )}
                />
                {form.formState.errors.exercises?.[index]?.name && (
                  <p className='text-xs text-destructive'>
                    {form.formState.errors.exercises[index]?.name?.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label>Weight & Unit</Label>
                <div className='flex space-x-2'>
                  <Input
                    type='number'
                    step='0.5'
                    className='flex-1'
                    placeholder='Weight'
                    {...form.register(`exercises.${index}.weight`, {
                      valueAsNumber: true
                    })}
                  />
                  <select
                    className='h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'
                    {...form.register(`exercises.${index}.weightUnit`)}
                  >
                    <option value='kg'>kg</option>
                    <option value='lbs'>lbs</option>
                  </select>
                </div>
                {form.formState.errors.exercises?.[index]?.weight && (
                  <p className='text-xs text-destructive'>
                    {form.formState.errors.exercises[index]?.weight?.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label>Sets & Rest</Label>
                <div className='flex space-x-2'>
                  <Input
                    type='number'
                    placeholder='Sets'
                    {...form.register(`exercises.${index}.sets`, {
                      valueAsNumber: true
                    })}
                  />
                  <Input
                    type='number'
                    placeholder='Rest(s)'
                    {...form.register(`exercises.${index}.restTime`, {
                      valueAsNumber: true
                    })}
                  />
                </div>
              </div>

              <div className='space-y-2 col-span-full'>
                <Label>Reps (comma separated for multiple sets)</Label>
                <Input
                  placeholder='e.g. 10, 10, 8'
                  // Handling array of numbers is tricky with simple input.
                  // We'll capture as string and transform? Or custom controller?
                  // For simplicity in this iteration: simple input that we parse on submit?
                  // No, Zod expects array. We should use a Controller or simple transform.
                  // Let's use a simple text input and handle transform in a wrapper or register options?
                  // register `setValueAs` works.
                  {...form.register(`exercises.${index}.reps`, {
                    setValueAs: (v) => {
                      if (Array.isArray(v)) return v
                      if (typeof v === "string")
                        return v
                          .split(",")
                          .map((n) => parseInt(n.trim()))
                          .filter((n) => !isNaN(n))
                      return []
                    }
                  })}
                />
                {form.formState.errors.exercises?.[index]?.reps && (
                  <p className='text-xs text-destructive'>
                    {form.formState.errors.exercises[index]?.reps?.message}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Enter reps for each set, separated by commas
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0'>
        <Button
          type='button'
          variant='outline'
          onClick={() =>
            append({
              name: "",
              weight: 0,
              weightUnit: "kg",
              sets: 3,
              reps: [10],
              restTime: 60
            })
          }
          className='w-full md:w-auto'
        >
          <Plus className='mr-2 h-4 w-4' /> Add Exercise
        </Button>
        <Button
          type='submit'
          disabled={isPending}
          className='w-full md:w-auto md:ml-auto'
        >
          {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Log Workout
        </Button>
      </div>
    </form>
  )
}
