'use client'

import { Column, DataTable } from "@/components/data-table/data-table";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalDialog } from "@/providers/DialogProvider";
import { getCategoryList, updateCategoryStatus } from "@/lib/actions/category";
import formatDate from "@/lib/utils/date";
import { Button, ButtonTooltip } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Category } from "@/lib/repositories/categoryRepository";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Edit2 } from "lucide-react";
import { encryptIdForUrl } from "@/lib/utils/crypto";


export default function CategoryListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [reload, setReload] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const { showError } = useGlobalDialog();
  const pathname = usePathname();

  useEffect(() => {
    if (!reload) return;
    (async () => {
      setLoading(true);
      try {
        const result = await getCategoryList({});
        setItems(result.result || []);
      } catch (error: any) {
        showError("Request Failed!", error?.message || error.toString());
      } finally {
        setLoading(false);
        setReload(false);
      }
    })();
  }, [reload]);

  const itemsRef = useRef<any[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const onStatusChange = useCallback(
    async (field: string, id: number, checked: boolean) => {
      const currentItems = itemsRef.current;
      const currentItem = currentItems.find(item => item.id === id);

      if (!currentItem) return;
      const previousValue = currentItem[field];

      setItems(prevItems => {
        return prevItems.map(item =>
          item.id === id
            ? { ...item, [field]: checked ? 1 : 0 }
            : item
        );
      });

      try {
        const result = await updateCategoryStatus({ field, status: checked ? '1' : '0', categoryId: id.toString() });
        if (!result.success) {
          setItems(prevItems => {
            return prevItems.map(item =>
              item.id === id
                ? { ...item, [field]: previousValue }
                : item
            );
          });
          showError("Request Failed!", result.message);
        }
      } catch (error: any) {
        setItems(prevItems => {
          return prevItems.map(item =>
            item.id === id
              ? { ...item, [field]: previousValue }
              : item
          );
        });
        showError("Request Failed!", error?.message || error.toString());
      }
    },
    [showError]
  );

  const columns: Column<Category>[] = [
    {
      id: "category_name",
      header: "Category Name",
      accessorKey: "category_name",
      sortable: true,
      visible: true,
    },
    {
      id: "item_count",
      header: "Items in Category",
      accessorKey: "item_count",
      sortable: true,
      visible: true,
    },
    {
      id: "creator_name",
      header: "Category Added By",
      accessorKey: "creator_name",
      sortable: true,
      visible: true,
    },
    {
      id: "created_on",
      header: "Created On",
      accessorKey: "created_on",
      sortable: true,
      visible: true,
      cell: (row) => {
        if (row.created_on) {
          return formatDate(row.created_on.toString(), 'dd-MM-yyyy');
        } else {
          return "N/A";
        }
      },
    },
    {
      id: "status",
      header: "Active",
      accessorKey: "status",
      cell: (row) => (
        <Switch
          checked={row.status == 1}
          onCheckedChange={(checked) => onStatusChange('status', row.category_id, checked)}
        />
      ),
      sortable: true,
      visible: true,
    },
    {
      id: "category_id",
      header: "Actions",
      accessorKey: "category_id",
      sortable: true,
      visible: true,
      align: 'right',
      cell: (row) => {
        return (
          <Link href={`${pathname}/edit/${encryptIdForUrl(String(row.category_id))}?h=Edit Category`}>
            <ButtonTooltip title="Edit Category" variant={'ghost'} size={'icon'}>
              <Edit2 />
            </ButtonTooltip>
          </Link>
        );
      },
    },
  ];

  return (
    <>
      {
        <Container>
          <CardHeader>
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-col space-y-1.5">
                <CardTitle>Category Management</CardTitle>
                <CardDescription>Manage your categories</CardDescription>
              </div>

              <Link href={`${pathname}/add?h=Add Category`}>
                <Button onClick={() => setSelected(null)}>
                  Add New
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={items}
              columns={columns}
              fillEmpty={true}
              loading={loading}
              setReload={setReload}
            />
          </CardContent>
        </Container>
      }
    </>
  );
}