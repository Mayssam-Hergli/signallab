%% TP1 : Signaux discrets
% Chaque section (%%) peut être exécutée seule avec Ctrl+Entrée dans MATLAB.
clear; close all; clc;

%% 1.1 Opérations sur les signaux discrets
t  = 0:0.01:30;                 % axe des temps : de 0 à 30 s, pas de 0.01 s (3001 points)

% Q1 - cosinus de période 5  ->  f = 1/5 Hz
x_cos = cos(2*pi*t/5);
figure('Name','1.1 - Q1');
plot(t, x_cos); xlabel('t (s)'); ylabel('Amplitude');
title('Cosinus de période T = 5 s'); grid on;

% Q2 - signal carré de période 3 : le signe d'un sinus de période 3
x_car = sign(sin(2*pi*t/3));    % sign() renvoie +1, -1 (ou 0 quand sin = 0)
figure('Name','1.1 - Q2');
plot(t, x_car); xlabel('t (s)'); ylabel('Amplitude');
title('Signal carré de période T = 3 s'); grid on;
axis([0 30 -1.5 1.5]);          % [xmin xmax ymin ymax]

% Q3 - somme : période = PPCM(5,3) = 15 s
x_som = x_cos + x_car;
T_som = lcm(5,3)                % pas de ';' -> MATLAB affiche 15
figure('Name','1.1 - Q3');
plot(t, x_som); xlabel('t (s)'); ylabel('Amplitude');
title(sprintf('Somme cosinus + carré (période = PPCM(5,3) = %d s)', T_som)); grid on;
xline(0:T_som:30, 'r--');       % repères verticaux toutes les 15 s pour vérifier la période

% Q4 - les trois courbes dans la même fenêtre
figure('Name','1.1 - Q4');
subplot(3,1,1); plot(t, x_cos); title('Cosinus, T = 5 s');  xlabel('t (s)'); grid on;
subplot(3,1,2); plot(t, x_car); title('Carré, T = 3 s');    xlabel('t (s)'); grid on;
axis([0 30 -1.5 1.5]);
subplot(3,1,3); plot(t, x_som); title('Somme, T = 15 s');   xlabel('t (s)'); grid on;

%% 1.2 Échantillonnage
f0   = 1e3;                     % T0 = 1 ms  ->  f0 = 1 kHz
tmax = 20e-3;                   % durée 20 ms
dt   = 20e-6;                   % pas de 20 µs : assez fin pour simuler le signal "continu"
tc   = 0:dt:tmax;
xc   = sin(2*pi*f0*tc);

fe_list = [4e3 2e3 1.1e3 0.9e3];

% Q1 + Q2 : signal "continu" puis signaux échantillonnés
figure('Name','1.2 - Signaux');
subplot(5,1,1); plot(tc*1e3, xc);
title('x(t) : sinus 1 kHz ("continu", pas 20 µs)'); xlabel('t (ms)'); grid on;
for k = 1:4
    fe = fe_list(k);
    n  = 0:1/fe:tmax;           % instants d'échantillonnage nTe
    xn = sin(2*pi*f0*n);        % x[n] = x(nTe)
    subplot(5,1,k+1);
    plot(tc*1e3, xc, 'Color', [0.8 0.8 0.8]); hold on;   % signal original en gris
    stem(n*1e3, xn, 'filled'); hold off;                  % échantillons
    title(sprintf('x[n], fe = %.1f kHz', fe/1e3)); xlabel('t (ms)'); grid on;
end

% Q3 : spectres avec freqz
% freqz(x, 1, Nfft, fe) traite x comme les coefficients d'un filtre RIF :
% |H(f)| est donc la transformée de Fourier de la séquence x[n].
figure('Name','1.2 - Spectres');
[H, f] = freqz(xc, 1, 4096, 1/dt);
subplot(5,1,1); plot(f, abs(H)); xlim([0 5e3]);
title('Spectre de x(t)'); xlabel('f (Hz)'); grid on;
for k = 1:4
    fe = fe_list(k);
    n  = 0:1/fe:tmax;
    xn = sin(2*pi*f0*n);
    [H, f] = freqz(xn, 1, 4096, fe);              % axe de 0 à fe/2
    subplot(5,1,k+1); plot(f, abs(H));
    title(sprintf('Spectre de x[n], fe = %.1f kHz', fe/1e3)); xlabel('f (Hz)'); grid on;
end
% Q4 (conclusion) :
%  - 4 kHz   : fe > 2 f0 -> pic à 1 kHz, signal correctement représenté.
%  - 2 kHz   : fe = 2 f0 exactement -> les échantillons tombent sur les zéros du sinus :
%              x[n] = sin(pi n) = 0. Le signal disparaît (cas limite de Shannon).
%  - 1.1 kHz : fe < 2 f0 -> repliement spectral : pic à |f0 - fe| = 100 Hz.
%  - 0.9 kHz : fe < 2 f0 -> repliement : pic à |f0 - fe| = 100 Hz aussi (sinus inversé).

%% 1.3 Quantification
f0 = 1e3; tmax = 20e-3; dt = 20e-6;
tc = 0:dt:tmax;
xc = sin(2*pi*f0*tc);           % Q1

fc = 2*f0                       % Q2 : fréquence de Nyquist = 2 fmax = 2 kHz
fe = 2*fc;                      % Q3 : fe = 2 fc = 4 kHz
n  = 0:1/fe:tmax;
xn = sin(2*pi*f0*n);

% Q4 : quantificateur linéaire sur [-A, A], N niveaux, pas q = 2A/N
A = 1;
figure('Name','1.3 - Quantification');
N_list = [64 256];
for k = 1:2
    N  = N_list(k);
    q  = 2*A/N;
    idx = floor((xn + A)/q);            % numéro de l'intervalle (0 ... N)
    idx = min(max(idx, 0), N-1);        % x = A exactement tombe dans le dernier niveau
    xq  = -A + (idx + 0.5)*q;           % valeur au milieu de l'intervalle
    e   = xn - xq;                      % erreur (bruit) de quantification

    % Q5 : RSB pratique vs théorique
    RSB_pratique  = 10*log10( mean(xn.^2) / mean(e.^2) );
    b             = log2(N);            % nombre de bits
    RSB_theorique = 6.02*b + 1.76;
    fprintf('N = %3d (%d bits) : RSB pratique = %.2f dB | théorique = %.2f dB\n', ...
            N, b, RSB_pratique, RSB_theorique);

    subplot(2,2,k);
    stem(n*1e3, xn); hold on; stairs(n*1e3, xq, 'r'); hold off;
    title(sprintf('Échantillons et signal quantifié, N = %d', N)); xlabel('t (ms)'); grid on;
    subplot(2,2,k+2);
    stem(n*1e3, e);
    title(sprintf('Erreur de quantification, N = %d', N)); xlabel('t (ms)'); grid on;
end
% Résultats attendus : 33.06 dB (vs 37.88) et 45.10 dB (vs 49.92).
% Écart de 4.77 dB = 10*log10(3) : avec fe = 4 f0, les échantillons valent
% seulement 0, 1, 0, -1. L'erreur vaut toujours ±q/2, donc sa puissance est q²/4
% au lieu de q²/12 (bruit uniforme supposé par la formule théorique).
