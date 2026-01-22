import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const countryCodes = [
  { code: '55', name: 'Brasil', flag: '🇧🇷' },
  { code: '1', name: 'EUA/Canadá', flag: '🇺🇸' },
  { code: '351', name: 'Portugal', flag: '🇵🇹' },
  { code: '54', name: 'Argentina', flag: '🇦🇷' },
  { code: '56', name: 'Chile', flag: '🇨🇱' },
  { code: '57', name: 'Colômbia', flag: '🇨🇴' },
  { code: '52', name: 'México', flag: '🇲🇽' },
  { code: '34', name: 'Espanha', flag: '🇪🇸' },
  { code: '44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '49', name: 'Alemanha', flag: '🇩🇪' },
  { code: '33', name: 'França', flag: '🇫🇷' },
  { code: '39', name: 'Itália', flag: '🇮🇹' },
];

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const CountryCodeSelect = ({ value, onValueChange }: CountryCodeSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[110px] h-11">
        <SelectValue placeholder="País" />
      </SelectTrigger>
      <SelectContent>
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>+{country.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
