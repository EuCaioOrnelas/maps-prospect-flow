import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: '55', country: 'Brasil', flag: '🇧🇷' },
  { code: '1', country: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '54', country: 'Argentina', flag: '🇦🇷' },
  { code: '56', country: 'Chile', flag: '🇨🇱' },
  { code: '57', country: 'Colômbia', flag: '🇨🇴' },
  { code: '51', country: 'Peru', flag: '🇵🇪' },
  { code: '598', country: 'Uruguai', flag: '🇺🇾' },
  { code: '595', country: 'Paraguai', flag: '🇵🇾' },
  { code: '591', country: 'Bolívia', flag: '🇧🇴' },
  { code: '593', country: 'Equador', flag: '🇪🇨' },
  { code: '58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '52', country: 'México', flag: '🇲🇽' },
  { code: '506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '507', country: 'Panamá', flag: '🇵🇦' },
  { code: '503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '34', country: 'Espanha', flag: '🇪🇸' },
  { code: '351', country: 'Portugal', flag: '🇵🇹' },
  { code: '39', country: 'Itália', flag: '🇮🇹' },
  { code: '33', country: 'França', flag: '🇫🇷' },
  { code: '49', country: 'Alemanha', flag: '🇩🇪' },
  { code: '44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '31', country: 'Países Baixos', flag: '🇳🇱' },
  { code: '32', country: 'Bélgica', flag: '🇧🇪' },
  { code: '41', country: 'Suíça', flag: '🇨🇭' },
  { code: '43', country: 'Áustria', flag: '🇦🇹' },
  { code: '46', country: 'Suécia', flag: '🇸🇪' },
  { code: '47', country: 'Noruega', flag: '🇳🇴' },
  { code: '45', country: 'Dinamarca', flag: '🇩🇰' },
  { code: '358', country: 'Finlândia', flag: '🇫🇮' },
  { code: '48', country: 'Polônia', flag: '🇵🇱' },
  { code: '353', country: 'Irlanda', flag: '🇮🇪' },
  { code: '81', country: 'Japão', flag: '🇯🇵' },
  { code: '82', country: 'Coreia do Sul', flag: '🇰🇷' },
  { code: '86', country: 'China', flag: '🇨🇳' },
  { code: '91', country: 'Índia', flag: '🇮🇳' },
  { code: '62', country: 'Indonésia', flag: '🇮🇩' },
  { code: '66', country: 'Tailândia', flag: '🇹🇭' },
  { code: '84', country: 'Vietnã', flag: '🇻🇳' },
  { code: '63', country: 'Filipinas', flag: '🇵🇭' },
  { code: '60', country: 'Malásia', flag: '🇲🇾' },
  { code: '65', country: 'Singapura', flag: '🇸🇬' },
  { code: '61', country: 'Austrália', flag: '🇦🇺' },
  { code: '64', country: 'Nova Zelândia', flag: '🇳🇿' },
  { code: '27', country: 'África do Sul', flag: '🇿🇦' },
  { code: '20', country: 'Egito', flag: '🇪🇬' },
  { code: '234', country: 'Nigéria', flag: '🇳🇬' },
  { code: '212', country: 'Marrocos', flag: '🇲🇦' },
  { code: '971', country: 'Emirados Árabes', flag: '🇦🇪' },
  { code: '966', country: 'Arábia Saudita', flag: '🇸🇦' },
  { code: '972', country: 'Israel', flag: '🇮🇱' },
  { code: '90', country: 'Turquia', flag: '🇹🇷' },
  { code: '7', country: 'Rússia', flag: '🇷🇺' },
];

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const CountryCodeSelect = ({ value, onValueChange }: CountryCodeSelectProps) => {
  const selectedCountry = countryCodes.find(c => c.code === value);
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[110px]">
        <SelectValue>
          {selectedCountry ? (
            <span className="flex items-center gap-1.5">
              <span>{selectedCountry.flag}</span>
              <span>+{selectedCountry.code}</span>
            </span>
          ) : (
            'DDI'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>+{country.code}</span>
              <span className="text-muted-foreground text-xs">{country.country}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
