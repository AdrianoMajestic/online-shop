"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  KeyRound,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface ProfileContentProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string;
    createdAt?: string | Date;
  };
}

export function ProfileContent({ initialUser }: ProfileContentProps) {
  // Session expiration handler: clears local Better Auth session and redirects smoothly
  const handleSessionExpired = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore network errors when signing out an invalid/expired session
    }
    window.location.href = "/login?reason=session_expired";
  };

  // Profile state
  const [name, setName] = useState(initialUser.name || "");
  const [phone, setPhone] = useState(initialUser.phone || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Validation rules for new password
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (name.trim().length < 2) {
      setProfileError("Имя должно содержать не менее 2 символов");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      if (res.status === 401 || res.status === 404) {
        await handleSessionExpired();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось обновить профиль");
      }

      setProfileSuccess("Личные данные успешно обновлены");
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Ошибка при сохранении данных"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Введите текущий пароль");
      return;
    }

    if (!hasMinLength || !hasLetter || !hasDigit) {
      setPasswordError(
        "Пароль должен содержать не менее 8 символов, включая буквы и цифры"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Новые пароли не совпадают");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (res.status === 401 || res.status === 404) {
        await handleSessionExpired();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось изменить пароль");
      }

      setPasswordSuccess("Пароль успешно изменен");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Ошибка при смене пароля"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const formattedDate = initialUser.createdAt
    ? new Date(initialUser.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Не указана";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Personal Details Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Личные данные
            </h2>
            <p className="text-xs text-muted-foreground">
              Просмотр и редактирование контактной информации
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Имя и фамилия <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Электронная почта (логин)</span>
            </label>
            <input
              type="email"
              value={initialUser.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-muted/60 text-muted-foreground text-sm cursor-not-allowed select-none"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Email используется для входа в магазин и не подлежит изменению.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Номер телефона для связи</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Зарегистрирован: {formattedDate}</span>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
            >
              {profileLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Сохранить профиль</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Change Password Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Безопасность и пароль
            </h2>
            <p className="text-xs text-muted-foreground">
              Изменение пароля учетной записи
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Текущий пароль <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Новый пароль <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Подтверждение нового пароля <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите новый пароль"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Password complexity checklist */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs">
            <span className="font-semibold text-foreground block mb-1">
              Требования к безопасности пароля:
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              <span
                className={hasMinLength ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}
              >
                Не менее 8 символов
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${hasLetter && hasDigit ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              <span
                className={hasLetter && hasDigit ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}
              >
                Содержит как буквы (A-Z), так и цифры (0-9)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${passwordsMatch ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              <span
                className={passwordsMatch ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}
              >
                Пароли совпадают
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={
                passwordLoading ||
                !hasMinLength ||
                !hasLetter ||
                !hasDigit ||
                !passwordsMatch
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-md shadow-purple-600/20"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Обновление...</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>Сменить пароль</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
