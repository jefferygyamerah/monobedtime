import { StoryStudio } from "@/components/story-studio";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-5 pb-20 pt-6 sm:px-8 lg:px-10">
      <section className="mb-10 grid gap-8 rounded-[40px] border border-white/10 bg-white/[0.03] px-6 py-8 shadow-[0_30px_160px_rgba(0,0,0,0.42)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFB170]">
            monobedtime
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Cuentos para dormir en español y en inglés, con identidad y calma.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
            Un estudio nocturno para familias que quieren historias más personales. Ingresa el nombre del niño, su edad, su contexto cultural y el lugar donde vive. Monobedtime devuelve un cuento suave, una moraleja útil y escenas ilustradas listas para demo.
          </p>
        </div>

        <div className="grid gap-3 self-end md:grid-cols-3 lg:grid-cols-1">
          {[
            "Español, English o modo bilingüe",
            "Variables premium listas para monetizar",
            "Escenas visuales pensadas para picture-books",
          ].map((item) => (
            <div key={item} className="rounded-[28px] border border-white/10 bg-black/35 px-5 py-5 text-sm leading-7 text-white/72">
              {item}
            </div>
          ))}
        </div>
      </section>

      <StoryStudio />
    </main>
  );
}
