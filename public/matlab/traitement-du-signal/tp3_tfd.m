%% TP3 : Transformée de Fourier Discrète
clear; close all; clc;
Fe = 1000;  Te = 1/Fe;

%% Q1  x1[n] = 3 cos(2π·100·nTe), tmax = 0.1 s
tmax = 0.1;
n  = 0:round(tmax*Fe)-1;        % N = 100 échantillons (0 à tmax-Te)
N  = length(n);
x1 = 3*cos(2*pi*100*n*Te);
f  = (-N/2:N/2-1)*Fe/N;         % axe des fréquences après fftshift, pas Fe/N = 10 Hz

%% Q2  Parties réelle et imaginaire de X1(f)
X1 = fftshift(fft(x1));
figure('Name','Q2 - X1(f)');
subplot(2,1,1); stem(f, real(X1)); title('Re\{X_1(f)\}'); xlabel('f (Hz)'); grid on;
subplot(2,1,2); stem(f, imag(X1)); title('Im\{X_1(f)\}'); xlabel('f (Hz)'); grid on;

%% Q3  Spectre d'amplitude
figure('Name','Q3 - |X1(f)|');
stem(f, abs(X1)); title('|X_1(f)|'); xlabel('f (Hz)'); grid on;

%% Q4  Bonnes amplitudes : diviser par N
% Raies à ±100 Hz d'amplitude 150 = N·A/2, au lieu de A/2 = 1.5.
% -> diviser par N (et multiplier par 2 pour un spectre unilatéral -> 3 = A).
% Bonnes fréquences : axe f = (-N/2 : N/2-1)·Fe/N.
figure('Name','Q4 - |X1(f)|/N');
stem(f, abs(X1)/N); title('|X_1(f)| / N  (raies à ±100 Hz, amplitude 1.5)'); xlabel('f (Hz)'); grid on;

%% Q5-6  x2[n] = 5 + x1[n] : composante continue
x2 = 5 + x1;
X2 = fftshift(fft(x2));
figure('Name','Q5 - X2(f)');
subplot(3,1,1); stem(f, real(X2)); title('Re\{X_2(f)\}'); grid on;
subplot(3,1,2); stem(f, imag(X2)); title('Im\{X_2(f)\}'); grid on;
subplot(3,1,3); stem(f, abs(X2)/N); title('|X_2(f)|/N'); xlabel('f (Hz)'); grid on;
% Q6 : la composante continue 5 crée une raie à f = 0 d'amplitude 5 (500 avant division par N).

%% Q7-8  x3[n] = 5 + cos(2π·100·nTe − π/3) : effet du retard
x3 = 5 + cos(2*pi*100*n*Te - pi/3);
X3 = fftshift(fft(x3));
figure('Name','Q7 - X3(f)');
subplot(3,1,1); stem(f, real(X3)/N); title('Re\{X_3(f)\}/N'); grid on;
subplot(3,1,2); stem(f, imag(X3)/N); title('Im\{X_3(f)\}/N'); grid on;
subplot(3,1,3); stem(f, abs(X3)/N);  title('|X_3(f)|/N'); xlabel('f (Hz)'); grid on;
% Q8 : le déphasage −π/3 multiplie la raie à +100 Hz par e^{−jπ/3} (et à −100 Hz par e^{+jπ/3}).
% Les parties réelle et imaginaire changent (0.25 ∓ 0.433j), mais l'amplitude reste 0.5 :
% un retard ne modifie que la phase, pas le spectre d'amplitude.

%% Q9-10  x4[n] = 5 + cos(2π·105·nTe) : résolution fréquentielle
figure('Name','Q9-10 - x4, différents tmax');
tmax_list = [0.05 0.1 0.2];
for k = 1:3
    Nk = round(tmax_list(k)*Fe);
    nk = 0:Nk-1;
    x4 = 5 + cos(2*pi*105*nk*Te);
    fk = (-Nk/2:Nk/2-1)*Fe/Nk;
    subplot(3,1,k); stem(fk, abs(fftshift(fft(x4)))/Nk);
    title(sprintf('|X_4(f)|/N, tmax = %.2f s, N = %d, \\Deltaf = Fe/N = %g Hz', tmax_list(k), Nk, Fe/Nk));
    xlabel('f (Hz)'); grid on;
end
% 105 Hz n'est un multiple de Δf = Fe/N que pour tmax = 0.2 s (Δf = 5 Hz) : une seule raie nette.
% Pour 0.05 s (Δf = 20 Hz) et 0.1 s (Δf = 10 Hz), 105 Hz tombe entre deux raies :
% l'énergie "fuit" sur les raies voisines (fuite spectrale). Plus tmax est long, meilleure est la résolution.

%% Q11  Plus petite puissance de 2 qui dépasse N
tmax = 0.05;
N = round(tmax*Fe);             % 50
p = puissance2(N);
fprintf('N = %d  ->  p = %d, 2^p = %d\n', N, p, 2^p);

%% Q12  Ajout de zéros (zero-padding)
n  = 0:N-1;
x4 = 5 + cos(2*pi*105*n*Te);
x5 = [x4 zeros(1, 2^p - N)];    % x5 de longueur 2^p = 64
L  = length(x5);
f4 = (-N/2:N/2-1)*Fe/N;
f5 = (-L/2:L/2-1)*Fe/L;
figure('Name','Q12 - Zero-padding');
subplot(2,1,1); stem(f4, abs(fftshift(fft(x4)))/N); title('|X_4(f)|/N, N = 50'); grid on;
subplot(2,1,2); stem(f5, abs(fftshift(fft(x5)))/N); title('|X_5(f)|/N, 64 points (zéros ajoutés)'); xlabel('f (Hz)'); grid on;
% Les zéros ajoutés donnent plus de points sur le même spectre (interpolation) : la courbe est plus lisse
% et le pic mieux localisé. Mais la résolution réelle (1/tmax) ne change pas. Utilité : longueur 2^p
% -> FFT plus rapide (algorithme radix-2), et meilleure visualisation.

%% Fonction (Q11)
function p = puissance2(N)
    p = 0;
    while 2^p <= N
        p = p + 1;
    end
end
