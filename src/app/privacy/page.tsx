import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica de Confidentialitate | GrantAssist Moldova',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Politica de Confidentialitate</h1>

        <p className="text-muted-foreground">
          Ultima actualizare: 1 martie 2026
        </p>

        <p>
          GrantAssist Moldova respecta confidentialitatea datelor dumneavoastra.
          Aceasta politica explica ce date colectam, cum le folosim si care sunt
          drepturile dumneavoastra.
        </p>

        <h2>1. Datele pe care le colectam</h2>

        <p>Colectam urmatoarele categorii de date:</p>

        <ul>
          <li>
            <strong>IDNO</strong> (numar de identificare al companiei) - pentru
            cautarea datelor din registrele publice
          </li>
          <li>
            <strong>Date despre companie</strong> - denumire, industrie,
            locatie, forma juridica - obtinute din registrele publice
          </li>
          <li>
            <strong>Date de contact</strong> - email, nume si telefon (la
            crearea contului)
          </li>
          <li>
            <strong>Necesitati de achizitie</strong> - ce doriti sa cumparati
            cu fondurile din grant
          </li>
          <li>
            <strong>Continut generat de AI</strong> - textele create pentru
            aplicatiile de grant
          </li>
        </ul>

        <h2>2. Cum folosim datele</h2>

        <p>Datele dumneavoastra sunt folosite exclusiv pentru:</p>

        <ul>
          <li>
            <strong>Potrivirea cu granturi</strong> - identificam granturile
            pentru care compania dumneavoastra este eligibila
          </li>
          <li>
            <strong>Asistenta AI la redactare</strong> - generam texte
            optimizate pentru aplicatiile de grant, folosind datele companiei
          </li>
          <li>
            <strong>Notificari</strong> - va informam despre termene limita si
            granturi noi relevante (doar daca ati optat pentru notificari)
          </li>
        </ul>

        <h2>3. Partajarea datelor</h2>

        <p>
          <strong>Nu vindem datele dumneavoastra.</strong> Nu le partajam cu
          terti in scopuri de marketing.
        </p>

        <p>Servicii terte utilizate:</p>

        <ul>
          <li>
            <strong>Supabase</strong> - baza de date si autentificare (datele
            sunt stocate securizat)
          </li>
          <li>
            <strong>OpenAI</strong> - procesare AI pentru generarea textelor
            (datele sunt anonimizate)
          </li>
        </ul>

        <p>Registre publice interogatate:</p>

        <ul>
          <li>openmoney.md</li>
          <li>idno.md</li>
          <li>srl.md</li>
        </ul>

        <p>
          Aceste registre sunt surse publice de date. Le interogam doar pe baza
          IDNO-ului furnizat de dumneavoastra.
        </p>

        <h2>4. Stocarea si securitatea</h2>

        <ul>
          <li>
            Datele sunt stocate in Supabase cu politici de securitate la nivel
            de rand (Row Level Security)
          </li>
          <li>
            Sesiunile sunt criptate folosind cookie-uri securizate
          </li>
          <li>
            Toate conexiunile folosesc HTTPS
          </li>
          <li>
            Accesul la date este limitat strict la contul dumneavoastra
          </li>
        </ul>

        <h2>5. Drepturile tale</h2>

        <p>Aveti dreptul sa:</p>

        <ul>
          <li>
            <strong>Accesati</strong> datele pe care le detinem despre
            dumneavoastra
          </li>
          <li>
            <strong>Modificati</strong> datele incorecte din profilul
            dumneavoastra
          </li>
          <li>
            <strong>Stergeti</strong> contul si toate datele asociate
          </li>
        </ul>

        <p>
          Pentru a va exercita aceste drepturi, contactati-ne la adresa de
          email de mai jos.
        </p>

        <h2>6. Cookie-uri</h2>

        <p>Folosim urmatoarele cookie-uri:</p>

        <ul>
          <li>
            <strong>Cookie de sesiune anonim</strong> (iron-session) - un cookie
            criptat HTTP-only care permite urmarirea profilului anonim. Acesta
            ne ajuta sa pastram datele companiei dumneavoastra intre vizite,
            chiar si fara cont.
          </li>
          <li>
            <strong>Cookie-uri de autentificare Supabase</strong> - necesare
            pentru mentinerea sesiunii dupa autentificare
          </li>
        </ul>

        <p>
          Nu folosim cookie-uri de marketing sau de urmarire a tertilor.
        </p>

        <h2>7. Contact</h2>

        <p>
          Pentru intrebari legate de confidentialitate sau pentru a va exercita
          drepturile, ne puteti contacta la:
        </p>

        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:privacy@grantassist.md" className="underline">
            privacy@grantassist.md
          </a>
        </p>
      </article>
    </div>
  )
}
