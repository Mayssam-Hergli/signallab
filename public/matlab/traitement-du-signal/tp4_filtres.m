%% TP4 : Analyse des filtres numériques
% Basé sur le programme fourni, avec deux corrections signalées en commentaire.
clear; close all; clc;

%% I.1  Période d'échantillonnage et coefficients
Te = 0.01;
% Exemple 1 : H(z) = (z - 0.3) / (z^2 - 1.3z + 0.7)
Num1 = [1 -0.3];        Den1 = [1 -1.3 0.7];
% Exemple 2 : H(z) = (z^2 - 0.3) / (z^3 - 1.3z^2 + 0.7z + 1.5)
Num2 = [1 0 -0.3];      Den2 = [1 -1.3 0.7 1.5];

%% I.2  Fonction de transfert en z (sans ';' pour l'afficher)
H1 = tf(Num1, Den1, Te)         % le programme fourni utilise dfilt.df1, déconseillé dans les versions récentes
pause(5)
H2 = tf(Num2, Den2, Te)
pause(5)

%% I.3  Pôles et zéros
zeros1 = roots(Num1), poles1 = roots(Den1)
zeros2 = roots(Num2), poles2 = roots(Den2)
fprintf('Ex.1 : |pôles| = %s -> stable\n',   mat2str(abs(poles1)', 4));
fprintf('Ex.2 : |pôles| = %s -> INSTABLE (2 pôles hors du cercle unité)\n', mat2str(abs(poles2)', 4));
figure('Name','I.3 - Pôles et zéros');
subplot(1,2,1); pzmap(H1); title('Exemple 1'); axis equal;
subplot(1,2,2); pzmap(H2); title('Exemple 2'); axis equal;
pause(5)

%% I.4  Transformée en z inverse (réponse impulsionnelle)
% impz interprète les coefficients en puissances de z^-1. Pour respecter H(z) écrit en
% puissances de z, on complète le numérateur par des zéros à gauche (même longueur que Den).
Num1z = [zeros(1, length(Den1)-length(Num1)) Num1];
Num2z = [zeros(1, length(Den2)-length(Num2)) Num2];
[h1, t1] = impz(Num1z, Den1, 30, 1/Te);
[h2, t2] = impz(Num2z, Den2, 30, 1/Te);
figure('Name','I.4 - Réponse impulsionnelle');
subplot(2,1,1); stem(t1, h1); title('h_1[n] (stable : tend vers 0)'); xlabel('t (s)'); grid on;
subplot(2,1,2); stem(t2, h2); title('h_2[n] (instable : diverge)');   xlabel('t (s)'); grid on;
pause(5)

%% I.5  Réponse en fréquence
% Correction : freqz(Num, Den, 1/Te) prend 1/Te = 100 comme NOMBRE DE POINTS.
% Pour un axe en Hz, il faut freqz(Num, Den, nPoints, Fe).
[Hf1, f1] = freqz(Num1z, Den1, 512, 1/Te);   % Num1z : même convention qu'en I.4
figure('Name','I.5 - Réponse en fréquence (exemple 1)');
subplot(2,1,1); plot(f1, abs(Hf1));   title('|H_1(f)|'); xlabel('f (Hz)'); grid on;
subplot(2,1,2); plot(f1, angle(Hf1)); title('arg H_1(f) (rad)'); xlabel('f (Hz)'); grid on;
pause(5)

%% II  Filtre passe-bas RII du second ordre
% Correction : le fascicule écrit le dénominateur 0.516z^2 - 1.2z + 1 (pôles hors du cercle : instable).
% Le programme fourni utilise a = [1 -1.2 0.516], c'est-à-dire H(z) = (0.079z^2 + 0.158z + 0.079)/(z^2 - 1.2z + 0.516).
% C'est la bonne version : pôles 0.6 ± 0.395j, |p| = 0.718 < 1, filtre stable.
b = [0.079 2*0.079 0.079];
a = [1 -1.2 0.516];

% II.1  Réponse impulsionnelle, N = 32
N = 32;  n = 0:N-1;
h = impz(b, a, N);
figure('Name','II.1 - Réponse impulsionnelle RII');
stem(n, h); title('Réponse impulsionnelle du filtre RII'); xlabel('n'); grid on;

% II.2  Réponse en fréquence, L = 256 points
L = 256;
[H, w] = freqz(b, a, L);        % w en rad/échantillon, de 0 à π
figure('Name','II.2 - Réponse en fréquence RII');
subplot(2,1,1); plot(w/pi, 20*log10(abs(H))); title('Réponse en amplitude (dB)');
xlabel('\omega / \pi'); grid on; yline(-3, 'r--', '-3 dB');
subplot(2,1,2); plot(w/pi, angle(H)); title('Réponse en phase (rad)'); xlabel('\omega / \pi'); grid on;
fprintf('Gain en continu : %.4f (%.2f dB) | coupure à -3 dB ≈ %.3f π rad/éch.\n', ...
        abs(H(1)), 20*log10(abs(H(1))), w(find(abs(H) < abs(H(1))/sqrt(2), 1))/pi);

% II.3  Pôles et zéros
figure('Name','II.3 - Pôles et zéros RII');
zplane(b, a); title('Pôles et zéros du filtre RII');
% Deux zéros en z = -1 : ils annulent la fréquence Fe/2 (passe-bas).
% Deux pôles 0.6 ± 0.395j à l'intérieur du cercle unité : filtre stable.
