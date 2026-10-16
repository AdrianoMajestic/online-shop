"use client";

import React, { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function ContactsPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1000);
  };

  const breadcrumbItems = [{ label: "Контакты" }];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-12 sm:space-y-16">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Контакты и реквизиты
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Мы всегда на связи и рады помочь вам с выбором техники, оформлением заказа или ответами на любые вопросы.
        </p>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Phone className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Телефон горячей линии</h2>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            8 (800) 555-35-35
          </p>
          <p className="text-xs text-muted-foreground">Звонок бесплатный по всей России</p>
        </div>

        <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Электронная почта</h2>
          <p className="text-sm font-semibold text-foreground">support@kabachok.shop</p>
          <p className="text-xs text-muted-foreground">Отвечаем в течение 30 минут</p>
        </div>

        <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <MapPin className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Центральный склад и офис</h2>
          <p className="text-xs text-foreground font-medium">г. Москва, ул. Профсоюзная, д. 56</p>
          <p className="text-xs text-muted-foreground">Пункт самовывоза №1</p>
        </div>

        <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Clock className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-foreground">График работы</h2>
          <p className="text-sm font-semibold text-foreground">Пн – Вс: 09:00 – 21:00</p>
          <p className="text-xs text-muted-foreground">Без перерывов и выходных</p>
        </div>
      </div>

      {/* Feedback Form & Requisites Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Contact Form */}
        <div className="lg:col-span-7 rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Напишите нам</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Заполните форму, и наш менеджер свяжется с вами в течение рабочего дня
            </p>
          </div>

          {isSubmitted ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Спасибо за обращение!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ваше сообщение успешно отправлено. Мы ответим вам на указанный email в ближайшее время.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Отправить ещё сообщение
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
                    Ваше имя *
                  </label>
                  <input
                    id="contact-name"
                    required
                    type="text"
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-semibold text-foreground">
                    Электронная почта *
                  </label>
                  <input
                    id="contact-email"
                    required
                    type="email"
                    placeholder="ivan@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="text-xs font-semibold text-foreground">
                  Тема обращения
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  placeholder="Вопрос по заказу или товару"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-semibold text-foreground">
                  Сообщение *
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  placeholder="Опишите ваш вопрос или пожелание..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>Отправить обращение</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Company Requisites */}
        <div className="lg:col-span-5 rounded-3xl border border-border/70 bg-muted/30 p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-foreground">Реквизиты организации</h2>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-muted-foreground font-medium">Полное наименование:</dt>
              <dd className="font-semibold text-foreground mt-0.5">
                Общество с ограниченной ответственностью «ТехноТорг»
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">ОГРН:</dt>
              <dd className="font-mono font-semibold text-foreground mt-0.5">1227700123456</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">ИНН / КПП:</dt>
              <dd className="font-mono font-semibold text-foreground mt-0.5">
                7701234567 / 770101001
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Юридический адрес:</dt>
              <dd className="font-semibold text-foreground mt-0.5">
                117420, г. Москва, ул. Профсоюзная, д. 56, офис 402
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Банковские реквизиты:</dt>
              <dd className="font-mono font-semibold text-foreground mt-0.5">
                Р/с: 40702810938000012345 в ПАО Сбербанк г. Москва, БИК: 044525225, К/с: 30101810400000000225
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
