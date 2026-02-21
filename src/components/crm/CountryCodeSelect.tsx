import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const countryCodes = [
  // América do Sul
  { code: '55', name: 'Brasil', flag: '🇧🇷' },
  { code: '54', name: 'Argentina', flag: '🇦🇷' },
  { code: '56', name: 'Chile', flag: '🇨🇱' },
  { code: '57', name: 'Colômbia', flag: '🇨🇴' },
  { code: '58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '51', name: 'Peru', flag: '🇵🇪' },
  { code: '593', name: 'Equador', flag: '🇪🇨' },
  { code: '595', name: 'Paraguai', flag: '🇵🇾' },
  { code: '598', name: 'Uruguai', flag: '🇺🇾' },
  { code: '591', name: 'Bolívia', flag: '🇧🇴' },
  // América do Norte e Central
  { code: '1', name: 'EUA/Canadá', flag: '🇺🇸' },
  { code: '52', name: 'México', flag: '🇲🇽' },
  { code: '507', name: 'Panamá', flag: '🇵🇦' },
  { code: '506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '1809', name: 'Rep. Dominicana', flag: '🇩🇴' },
  // Europa
  { code: '351', name: 'Portugal', flag: '🇵🇹' },
  { code: '34', name: 'Espanha', flag: '🇪🇸' },
  { code: '44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '33', name: 'França', flag: '🇫🇷' },
  { code: '49', name: 'Alemanha', flag: '🇩🇪' },
  { code: '39', name: 'Itália', flag: '🇮🇹' },
  { code: '31', name: 'Holanda', flag: '🇳🇱' },
  { code: '32', name: 'Bélgica', flag: '🇧🇪' },
  { code: '41', name: 'Suíça', flag: '🇨🇭' },
  { code: '43', name: 'Áustria', flag: '🇦🇹' },
  { code: '46', name: 'Suécia', flag: '🇸🇪' },
  { code: '47', name: 'Noruega', flag: '🇳🇴' },
  { code: '45', name: 'Dinamarca', flag: '🇩🇰' },
  { code: '358', name: 'Finlândia', flag: '🇫🇮' },
  { code: '48', name: 'Polônia', flag: '🇵🇱' },
  { code: '420', name: 'Rep. Tcheca', flag: '🇨🇿' },
  { code: '30', name: 'Grécia', flag: '🇬🇷' },
  { code: '353', name: 'Irlanda', flag: '🇮🇪' },
  { code: '40', name: 'Romênia', flag: '🇷🇴' },
  // Outros
  { code: '971', name: 'Emirados Árabes', flag: '🇦🇪' },
  { code: '972', name: 'Israel', flag: '🇮🇱' },
  { code: '91', name: 'Índia', flag: '🇮🇳' },
  { code: '81', name: 'Japão', flag: '🇯🇵' },
  { code: '61', name: 'Austrália', flag: '🇦🇺' },
  { code: '27', name: 'África do Sul', flag: '🇿🇦' },
  { code: '234', name: 'Nigéria', flag: '🇳🇬' },
  { code: '244', name: 'Angola', flag: '🇦🇴' },
  { code: '258', name: 'Moçambique', flag: '🇲🇿' },
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
