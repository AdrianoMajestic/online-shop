"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  History,
  Search,
  RefreshCw,
  Globe,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileCode,
  Tag,
  Shield,
  Clock,
} from "lucide-react";
import type { AuditLogsResult, AuditLogItem } from "@/services/audit";

interface AdminAuditContentProps {
  initialData: AuditLogsResult;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "user.login": { label: "Вход в систему", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  "order.status_change": { label: "Смена статуса заказа", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  "product.price_change": { label: "Изменение цены товара", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  "product.stock_change": { label: "Изменение остатка товара", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  "product.deactivate": { label: "Деактивация товара", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  "product.publish": { label: "Публикация товара", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  "product.delete": { label: "Удаление товара", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "category.delete": { label: "Удаление категории", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  "category.visibility": { label: "Видимость категории", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  "category.hide": { label: "Скрытие категории", color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" },
  "brand.delete": { label: "Удаление бренда", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "delivery_method.delete": { label: "Удаление доставки", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "promocode.deactivate": { label: "Деактивация промокода", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  "promocode.delete": { label: "Удаление промокода", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "user.role_change": { label: "Смена роли пользователя", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  "user.ban": { label: "Блокировка пользователя", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "user.unban": { label: "Разблокировка пользователя", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const ENTITY_LABELS: Record<string, string> = {
  User: "Пользователь",
  Order: "Заказ",
  Product: "Товар",
  Category: "Категория",
  Brand: "Бренд",
  DeliveryMethod: "Доставка",
  PromoCode: "Промокод",
};

export function AdminAuditContent({ initialData }: AdminAuditContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters state initialized from URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [action, setAction] = useState(searchParams.get("action") || "all");
  const [entity, setEntity] = useState(searchParams.get("entity") || "all");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (action && action !== "all") params.set("action", action);
    if (entity && entity !== "all") params.set("entity", entity);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleReset = () => {
    setQ("");
    setAction("all");
    setEntity("all");
    setStartDate("");
    setEndDate("");
    router.push("/admin/audit");
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/admin/audit?${params.toString()}`);
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-inner">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Журнал аудита системы</h1>
            <p className="text-xs text-indigo-200/80">
              Хронологическая фиксация критических действий: авторизация, заказы, цены, остатки и администрирование
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search query */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="audit-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Поиск по ID, IP, email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action filter */}
          <div>
            <select
              id="audit-action-select"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Все действия</option>
              {initialData.availableActions.map((act) => (
                <option key={act} value={act}>
                  {ACTION_LABELS[act]?.label || act}
                </option>
              ))}
            </select>
          </div>

          {/* Entity filter */}
          <div>
            <select
              id="audit-entity-select"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Все сущности</option>
              {initialData.availableEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ENTITY_LABELS[ent] || ent}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <input
              type="date"
              id="audit-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              title="Дата с"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <input
              type="date"
              id="audit-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              title="Дата по"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
          <div className="text-muted-foreground font-medium">
            Найдено записей: <span className="text-foreground font-semibold">{initialData.total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              id="audit-reset-btn"
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Сбросить
            </button>
            <button
              onClick={applyFilters}
              id="audit-apply-btn"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors cursor-pointer"
            >
              Применить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Время</th>
                <th className="py-3 px-4">Действие</th>
                <th className="py-3 px-4">Сущность & ID</th>
                <th className="py-3 px-4">Пользователь</th>
                <th className="py-3 px-4">IP-адрес</th>
                <th className="py-3 px-4 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialData.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-base">Записи аудита не найдены</p>
                    <p className="text-xs mt-1">Попробуйте изменить параметры поиска или сбросить фильтры</p>
                  </td>
                </tr>
              ) : (
                initialData.logs.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action] || {
                    label: log.action,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  const entityName = ENTITY_LABELS[log.entity] || log.entity;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          <span>{formatTimestamp(log.at)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${actionMeta.color}`}
                        >
                          {actionMeta.label}
                        </span>
                      </td>

                      {/* Entity & EntityId */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground opacity-70" />
                            {entityName}
                          </span>
                          <span
                            className="font-mono text-xs text-muted-foreground truncate max-w-[180px]"
                            title={log.entityId}
                          >
                            {log.entityId}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        {log.userName || log.userEmail ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-foreground">
                              {log.userName || "Пользователь"}
                            </span>
                            {log.userEmail && (
                              <span className="text-muted-foreground truncate max-w-[200px]">
                                {log.userEmail}
                              </span>
                            )}
                          </div>
                        ) : log.userId ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.userId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
                            <Shield className="h-3 w-3" />
                            Система
                          </span>
                        )}
                      </td>

                      {/* IP address */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.ip ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 text-muted-foreground">
                            <Globe className="h-3 w-3 opacity-60" />
                            {log.ip}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Details / Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Подробнее</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {initialData.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Страница <span className="font-semibold text-foreground">{initialData.page}</span> из{" "}
              <span className="font-semibold text-foreground">{initialData.totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={initialData.page <= 1}
                onClick={() => handlePageChange(initialData.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Назад</span>
              </button>

              <button
                disabled={initialData.page >= initialData.totalPages}
                onClick={() => handlePageChange(initialData.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
              >
                <span>Вперед</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail inspection modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    Детали записи аудита
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block mb-0.5 font-medium">Действие</span>
                <span className="font-semibold text-foreground">
                  {ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground mt-0.5">
                  ({selectedLog.action})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block mb-0.5 font-medium">Объект / Сущность</span>
                <span className="font-semibold text-foreground">
                  {ENTITY_LABELS[selectedLog.entity] || selectedLog.entity}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                  ID: {selectedLog.entityId}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block mb-0.5 font-medium">Пользователь</span>
                <span className="font-semibold text-foreground">
                  {selectedLog.userName || "Не указан"}
                </span>
                {selectedLog.userEmail && (
                  <span className="block text-muted-foreground truncate">
                    {selectedLog.userEmail}
                  </span>
                )}
                {selectedLog.userId && (
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    ID: {selectedLog.userId}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block mb-0.5 font-medium">Время и IP-адрес</span>
                <span className="font-mono text-foreground block">
                  {formatTimestamp(selectedLog.at)}
                </span>
                <span className="font-mono text-muted-foreground block mt-0.5">
                  IP: {selectedLog.ip || "127.0.0.1"}
                </span>
              </div>
            </div>

            {/* Meta JSON Payload */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Контекстные данные события (Meta Payload)
              </span>
              <pre className="p-4 rounded-xl bg-muted/60 border border-border text-xs font-mono text-foreground overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(selectedLog.meta, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
