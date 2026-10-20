import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageAlternates, pageSocialMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { AboutFaq } from "./AboutFaq";

const ABOUT_PATH = "/about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.metadata" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: pageAlternates(ABOUT_PATH, locale),
    ...pageSocialMetadata({ title, description, path: ABOUT_PATH, locale }),
  };
}

const ctaClass =
  "inline-flex h-11 items-center justify-center px-6 font-mono text-[11px] uppercase tracking-[0.18em] transition-[color,background-color,border-color,transform] duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  const product = [
    { title: t("product.item1_title"), body: t("product.item1_body") },
    { title: t("product.item2_title"), body: t("product.item2_body") },
    { title: t("product.item3_title"), body: t("product.item3_body") },
    { title: t("product.item4_title"), body: t("product.item4_body") },
    { title: t("product.item5_title"), body: t("product.item5_body") },
  ];

  const method = [
    { title: t("method.step1_title"), body: t("method.step1_body") },
    { title: t("method.step2_title"), body: t("method.step2_body") },
    { title: t("method.step3_title"), body: t("method.step3_body") },
  ];

  const faq = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q6"), answer: t("faq.a6") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[88rem] px-6 sm:px-8 lg:px-12">
        <div className="py-6 sm:py-8">
          <LandingHeader />
        </div>

        <main>
          <section
            className="border-t border-border py-16 sm:py-20 lg:py-28"
            aria-labelledby="about-title"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("hero.kicker")}
                </p>
                <h1
                  id="about-title"
                  className="enter-rise mt-6 max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl"
                >
                  {t("hero.title")}
                </h1>
              </div>

              <div className="lg:col-span-4 lg:col-start-9">
                <p className="enter-rise max-w-[46ch] text-pretty text-base leading-7 text-muted-foreground [animation-delay:70ms]">
                  {t("hero.lead")}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={ROUTES.REGISTER}
                    className={`${ctaClass} bg-primary text-primary-foreground hover:bg-primary/90`}
                  >
                    {t("hero.cta_create")}
                  </Link>
                  <Link
                    href={ROUTES.LOGIN}
                    className={`${ctaClass} border border-border text-foreground hover:border-foreground`}
                  >
                    {t("hero.cta_signin")}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section
            className="border-t border-border py-16 sm:py-20 lg:py-24"
            aria-labelledby="about-product"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("product.label")}
                </p>
                <h2
                  id="about-product"
                  className="mt-4 max-w-[18ch] text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl"
                >
                  {t("product.title")}
                </h2>
                <p className="mt-4 max-w-[42ch] text-sm leading-6 text-muted-foreground">
                  {t("product.lead")}
                </p>
              </div>

              <div className="lg:col-span-7 lg:col-start-6">
                <dl className="border-t border-border">
                  {product.map((item) => (
                    <div
                      key={item.title}
                      className="grid grid-cols-1 gap-x-8 gap-y-1 border-b border-border py-5 sm:grid-cols-[11rem_1fr]"
                    >
                      <dt className="text-sm font-semibold">{item.title}</dt>
                      <dd className="max-w-[52ch] text-sm leading-6 text-muted-foreground">
                        {item.body}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          <section
            className="border-t border-border py-16 sm:py-20 lg:py-24"
            aria-labelledby="about-roles"
          >
            <h2
              id="about-roles"
              className="max-w-[24ch] text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl"
            >
              {t("roles.title")}
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-y-10 lg:grid-cols-2 lg:gap-x-16">
              <div>
                <h3 className="text-lg font-semibold">{t("roles.athlete_title")}</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-6 text-muted-foreground">
                  {t("roles.athlete_body")}
                </p>
                <ul className="mt-5 space-y-2">
                  {[t("roles.athlete_1"), t("roles.athlete_2"), t("roles.athlete_3")].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-sm leading-6 text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 bg-foreground"
                        />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="lg:border-l lg:border-border lg:pl-16">
                <h3 className="text-lg font-semibold">{t("roles.trainer_title")}</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-6 text-muted-foreground">
                  {t("roles.trainer_body")}
                </p>
                <ul className="mt-5 space-y-2">
                  {[t("roles.trainer_1"), t("roles.trainer_2"), t("roles.trainer_3")].map(
                    (item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-sm leading-6 text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 bg-foreground"
                        />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </section>

          <section
            className="border-t border-border py-16 sm:py-20 lg:py-24"
            aria-labelledby="about-method"
          >
            <h2
              id="about-method"
              className="max-w-[24ch] text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl"
            >
              {t("method.title")}
            </h2>
            <p className="mt-4 max-w-[52ch] text-sm leading-6 text-muted-foreground">
              {t("method.lead")}
            </p>

            <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
              {method.map((step) => (
                <li key={step.title} className="border-t border-border pt-5">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-[38ch] text-sm leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="border-t border-border py-16 sm:py-20 lg:py-24"
            aria-labelledby="about-faq"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("faq.label")}
                </p>
                <h2
                  id="about-faq"
                  className="mt-4 max-w-[16ch] text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl"
                >
                  {t("faq.title")}
                </h2>
              </div>

              <div className="lg:col-span-7 lg:col-start-6">
                <AboutFaq items={faq} />
              </div>
            </div>
          </section>

          <section
            className="border-t border-border py-16 sm:py-20 lg:py-24"
            aria-labelledby="about-cta"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <h2
                  id="about-cta"
                  className="max-w-[20ch] text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
                >
                  {t("cta.title")}
                </h2>
                <p className="mt-4 max-w-[52ch] text-sm leading-6 text-muted-foreground">
                  {t("cta.body")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-4 lg:col-start-9 lg:justify-end">
                <Link
                  href={ROUTES.REGISTER}
                  className={`${ctaClass} bg-primary text-primary-foreground hover:bg-primary/90`}
                >
                  {t("cta.create")}
                </Link>
                <Link
                  href={ROUTES.LOGIN}
                  className={`${ctaClass} border border-border text-foreground hover:border-foreground`}
                >
                  {t("cta.signin")}
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border py-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>{t("footer.copy")}</span>
            <Link
              href={ROUTES.HOME}
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("footer.home")}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
