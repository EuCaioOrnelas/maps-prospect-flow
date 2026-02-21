import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

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
  { code: '1', name: 'EUA / Canadá', flag: '🇺🇸' },
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
  const [open, setOpen] = React.useState(false);
  const selected = countryCodes.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] h-11 justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span>{selected.flag}</span>
              <span>{selected.name}</span>
              <span className="text-muted-foreground">+{selected.code}</span>
            </span>
          ) : (
            'Selecione o país'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandList>
            <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
            <CommandGroup>
              {countryCodes.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === country.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="text-muted-foreground">+{country.code}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
