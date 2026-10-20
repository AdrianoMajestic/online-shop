"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  ShoppingCart,
  Calendar,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import {
  OrderStatus,
  ALL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/lib/order-status";

interface OrderListItem {
  _id: string;
  number: string;
  contact: {
    fullName: string;
    phone: string;
    email: string;
  };
  delivery: {
    title: string;
    price: number;
  };
  shippingAddress: {
    city: string;
    street: string;
    house: string;
  };
  items: {
    sku: string;
    title: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  discountAmount: number;
  deliveryCost: number;
  finalAmount: number;
  status: OrderStatus;
  paymentMethod: "card_online" | "cod";
  customerComment?: string;
  createdAt: string;
}

export function AdminOrdersList() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Не удалось загрузить список заказов");
      }

      setOrders(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при загрузке заказов");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Управление заказами</span>
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              Всего: {total}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Контроль статусов, обработка заказов, просмотр истории и заметок сотрудников.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Ошибка</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Number or Email */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="admin-orders-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Номер заказа (KB-...) или email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="admin-orders-status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Все статусы заказов</option>
              {ALL_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              id="admin-orders-date-from"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              title="Дата оформления от"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              id="admin-orders-date-to"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              title="Дата оформления до"
            />
          </div>
        </div>

        {/* Action / Reset Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>
              Найдено: <strong>{total}</strong> заказов
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(searchQuery || filterStatus !== "all" || dateFrom || dateTo) && (
              <button
                onClick={handleResetFilters}
                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
              >
                <X className="h-3.5 w-3.5" />
                <span>Сбросить фильтры</span>
              </button>
            )}
            <button
              onClick={() => fetchOrders()}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded-md hover:bg-muted"
              title="Обновить список заказов"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Загрузка реестра заказов...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground text-base">Заказы не найдены</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              По заданным критериям фильтрации заказов не обнаружено.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Номер / Дата</th>
                  <th className="py-3 px-4">Покупатель</th>
                  <th className="py-3 px-4">Доставка</th>
                  <th className="py-3 px-4">Оплата</th>
                  <th className="py-3 px-4">Сумма</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Управление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => {
                  const variant = ORDER_STATUS_VARIANTS[o.status] || {
                    label: o.status,
                    badgeClass: "bg-muted text-foreground border-border",
                  };
                  const dateFormatted = new Date(o.createdAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const paymentMethodLabel =
                    o.paymentMethod === "card_online"
                      ? "Онлайн картой"
                      : "При получении";

                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-muted/30 transition-colors group"
                      id={`order-row-${o.number}`}
                    >
                      {/* Number & Date */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/orders/${o.number}`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <span>{o.number}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground line-clamp-1">
                          {o.contact.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {o.contact.email}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                          {o.contact.phone}
                        </div>
                      </td>

                      {/* Delivery */}
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-foreground">
                          {o.delivery.title}
                        </div>
                        <div className="text-muted-foreground truncate max-w-[180px]">
                          г. {o.shippingAddress.city}, {o.shippingAddress.street}
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className="font-medium text-foreground">
                          {paymentMethodLabel}
                        </span>
                      </td>

                      {/* Final Amount */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-foreground">
                        {formatPrice(o.finalAmount)}
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {o.items.reduce((acc, i) => acc + i.quantity, 0)} шт.
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variant.badgeClass}`}
                        >
                          {variant.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${o.number}`}
                          id={`manage-order-${o.number}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                        >
                          <span>Карточка</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Страница <strong>{page}</strong> из <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                ← Назад
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Вперед →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
