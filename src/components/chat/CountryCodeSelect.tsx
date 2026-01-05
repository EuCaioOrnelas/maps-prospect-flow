import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: '55', country: 'Brasil', flag: '🇧🇷' },
  { code: '1', country: 'Estados Unidos', flag: '🇺🇸' },
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
  { code: '34', country: 'Espanha', flag: '🇪🇸' },
  { code: '351', country: 'Portugal', flag: '🇵🇹' },
  { code: '39', country: 'Itália', flag: '🇮🇹' },
  { code: '33', country: 'França', flag: '🇫🇷' },
  { code: '49', country: 'Alemanha', flag: '🇩🇪' },
  { code: '44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '81', country: 'Japão', flag: '🇯🇵' },
  { code: '86', country: 'China', flag: '🇨🇳' },
  { code: '91', country: 'Índia', flag: '🇮🇳' },
  { code: '61', country: 'Austrália', flag: '🇦🇺' },
  { code: '27', country: 'África do Sul', flag: '🇿🇦' },
  { code: '971', country: 'Emirados Árabes', flag: '🇦🇪' },
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
