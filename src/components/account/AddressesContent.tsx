"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building,
} from "lucide-react";

export interface AddressItem {
  _id: string;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode: string;
  comment?: string;
}

interface AddressesContentProps {
  initialAddresses: AddressItem[];
}

export function AddressesContent({ initialAddresses }: AddressesContentProps) {
  const [addresses, setAddresses] = useState<AddressItem[]>(initialAddresses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);

  // Form fields
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apartment, setApartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [comment, setComment] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [deletingAddress, setDeletingAddress] = useState<AddressItem | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingAddress(null);
    setCity("");
    setStreet("");
    setHouse("");
    setApartment("");
    setPostalCode("");
    setComment("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: AddressItem) => {
    setEditingAddress(addr);
    setCity(addr.city);
    setStreet(addr.street);
    setHouse(addr.house);
    setApartment(addr.apartment || "");
    setPostalCode(addr.postalCode);
    setComment(addr.comment || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!city.trim() || !street.trim() || !house.trim()) {
      setFormError("Заполните обязательные поля: город, улица, номер дома");
      return;
    }

    if (postalCode.trim().length < 5) {
      setFormError("Почтовый индекс должен содержать не менее 5 символов");
      return;
    }

    setFormLoading(true);
    const payload = {
      city: city.trim(),
      street: street.trim(),
      house: house.trim(),
      apartment: apartment.trim(),
      postalCode: postalCode.trim(),
      comment: comment.trim(),
    };

    try {
      if (editingAddress) {
        // PUT /api/addresses/[id]
        const res = await fetch(`/api/addresses/${editingAddress._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Не удалось обновить адрес");
        }

        setAddresses((prev) =>
          prev.map((a) => (a._id === editingAddress._id ? data.address : a))
        );
        setSuccessMessage("Адрес успешно обновлен");
      } else {
        // POST /api/addresses
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Не удалось сохранить адрес");
        }

        setAddresses((prev) => [data.address, ...prev]);
        setSuccessMessage("Новый адрес успешно добавлен");
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Ошибка при сохранении адреса"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!deletingAddress) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/addresses/${deletingAddress._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось удалить адрес");
      }

      setAddresses((prev) => prev.filter((a) => a._id !== deletingAddress._id));
      setDeletingAddress(null);
      setSuccessMessage("Адрес успешно удален");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Ошибка при удалении адреса"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Адресная книга
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Управляйте сохраненными адресами для быстрого оформления заказов
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить новый адрес</span>
        </button>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Addresses Grid or Empty State */}
      {addresses.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card/50 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Building className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Адреса не сохранены
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Сохраните адрес доставки, чтобы не вводить его каждый раз при
              оформлении заказа.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить первый адрес</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      г. {addr.city}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      ул. {addr.street}, д. {addr.house}
                      {addr.apartment ? `, кв. ${addr.apartment}` : ""}
                    </p>
                    <p className="text-muted-foreground/80 text-[11px] mt-0.5">
                      Индекс: {addr.postalCode}
                    </p>
                  </div>
                </div>

                {addr.comment && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground italic">
                    Примечание: «{addr.comment}»
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => openEditModal(addr)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Редактировать</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeletingAddress(addr);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Удалить</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingAddress ? "Редактировать адрес" : "Новый адрес доставки"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Город <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Почтовый индекс <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="101000"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Улица <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="ул. Тверская"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Дом <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    placeholder="10"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Квартира / Офис
                  </label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="25"
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Комментарий для курьера
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Код домофона, подъезд, этаж"
                  className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-md shadow-emerald-600/20"
                >
                  {formLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>
                    {editingAddress ? "Сохранить изменения" : "Добавить адрес"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-full bg-rose-500/10">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Удаление адреса
                </h3>
                <p className="text-xs text-muted-foreground">
                  Подтверждение действия
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">
              Вы уверены, что хотите удалить адрес:{" "}
              <strong>
                г. {deletingAddress.city}, ул. {deletingAddress.street}, д.{" "}
                {deletingAddress.house}
              </strong>
              ?
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAddress}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-md shadow-rose-600/20"
              >
                {deleteLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Удалить адрес</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
