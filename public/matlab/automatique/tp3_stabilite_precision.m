%% TP3 : Stabilité et précision d'un système échantillonné asservi
% Automatique linéaire échantillonnée - INSAT
% Nécessite la Control System Toolbox (tf, c2d, feedback, rlocus).
% La période T n'est pas donnée dans le fascicule : on prend T = 0.1 s (partie II)
% et T = 1 s (partie III), puis on fait varier T.
clear; close all; clc;

%% II.3-4  G(z) en boucle fermée : G1(s) = 1/(s+1), C = K, bloqueur d'ordre 0
T = 0.1;  K = 1;
G1 = tf(1, [1 1]);

% c2d avec 'zoh' calcule Z{ B0(s) G1(s) } = (1 - z^-1) Z{ G1(s)/s }
Gz = c2d(G1, T, 'zoh')

% Calcul à la main : Z{1/(s(s+1))} donne  G(z) = (1 - e^-T) / (z - e^-T)
a = exp(-T);
Gz_main = tf(1 - a, [1 -a], T)

% Boucle fermée : F(z) = K G(z) / (1 + K G(z)) = K(1-a) / (z - a + K(1-a))
Fz = feedback(K*Gz, 1)
Fz_main = tf(K*(1-a), [1, -a + K*(1-a)], T)

%% II.5  Ordre, pôles, zéros, lieu des racines
fprintf('Ordre du système : %d\n', order(Fz));
fprintf('Pôle  : %.4f   (|pôle| < 1 -> stable)\n', pole(Fz));
fprintf('Zéros : %d zéro(s)\n', numel(zero(Fz)));

figure('Name','II.5 - Lieu des racines');
rlocus(Gz); zgrid; axis equal;
title(sprintf('Lieu des racines de K·G(z), T = %.2f s', T));
% Le pôle part de z = a (K = 0) et se déplace vers la gauche sur l'axe réel.
% Il sort du cercle unité en z = -1.

%% II.6  Réponse indicielle (équivalent de la simulation Simulink)
figure('Name','II.6 - Réponse indicielle');
step(Fz, 5); grid on;
title(sprintf('Réponse indicielle en boucle fermée, K = %g, T = %.2f s', K, T));

%% II.7  Stabilité selon K et valeur limite
% Pôle p = a - K(1-a). Stable si -1 < p < 1  <=>  -1 < K < (1+a)/(1-a)
Kmax = (1 + a)/(1 - a);
fprintf('\nT = %.2f s  ->  K limite = (1+e^-T)/(1-e^-T) = %.4f\n', T, Kmax);

K_list = [1, 0.5*Kmax, 0.95*Kmax, 1.05*Kmax];
figure('Name','II.7 - Effet de K');
for i = 1:4
    Fi = feedback(K_list(i)*Gz, 1);
    subplot(2,2,i); step(Fi, 3); grid on;
    title(sprintf('K = %.2f  (pôle = %.3f)', K_list(i), pole(Fi)));
end
% K < Kmax : stable. Plus K est grand, plus le pôle tend vers -1 et plus la
% réponse oscille. K > Kmax : instable (oscillations qui divergent).

% K limite en fonction de T : plus on échantillonne lentement, plus Kmax diminue
T_vec = 0.01:0.01:2;
figure('Name','II.7 - Kmax(T)');
plot(T_vec, (1+exp(-T_vec))./(1-exp(-T_vec)), 'LineWidth', 1.5); grid on;
xlabel('T (s)'); ylabel('K_{max}'); title('Gain limite de stabilité en fonction de T');
ylim([0 50]);

% Erreur statique (consigne échelon unité) : e = 1/(1+K), car G(1) = 1
fprintf('Erreur statique pour K = %g : %.4f (théorique 1/(1+K) = %.4f)\n', ...
        K, 1 - dcgain(Fz), 1/(1+K));

%% III.1-2  Réservoir : G1(s) = 12.5/(50s+1)
T = 1;  K = 1;  consigne = 2;           % 2 m
G1r = tf(12.5, [50 1]);
Gzr = c2d(G1r, T, 'zoh')

b = exp(-T/50);
Gzr_main = tf(12.5*(1-b), [1 -b], T)    % G(z) = 12.5(1 - e^{-T/50}) / (z - e^{-T/50})
Fzr = feedback(K*Gzr, 1)

%% III.3  Réponse pour différentes périodes T
T_list = [1 5 10 50];
figure('Name','III.3 - Effet de T');
hold on;
for Ti = T_list
    Fi = feedback(K*c2d(G1r, Ti, 'zoh'), 1);
    step(consigne*Fi, 300);
end
hold off; grid on;
legend(arrayfun(@(x) sprintf('T = %g s', x), T_list, 'UniformOutput', false));
title(sprintf('Hauteur H (m), consigne 2 m, K = %g', K));
% Les réponses aux instants d'échantillonnage restent proches tant que T << 50 s.
% Quand T augmente, Kmax baisse : à T = 50 s, K = 1 rend déjà le système instable.

%% III.4  Valeur de K pour atteindre 2 m
% Avec un correcteur proportionnel, H(inf) = 2 · 12.5K / (1 + 12.5K) < 2 :
% on n'atteint jamais exactement 2 m (erreur statique non nulle).
% Plus K est grand, plus on s'approche de 2 m, mais K doit rester < Kmax(T).
Kmax_r = (1 + b)/(12.5*(1 - b));
K_2pc  = 0.98/(12.5*0.02);             % K pour une erreur de 2 % : 12.5K >= 49
fprintf('\nRéservoir, T = %g s : Kmax = %.4f\n', T, Kmax_r);
fprintf('K pour erreur <= 2%% : K >= %.2f (compatible si < Kmax)\n', K_2pc);
fprintf('Avec K = %.2f : H(inf) = %.4f m\n', K_2pc, consigne*12.5*K_2pc/(1+12.5*K_2pc));

%% III.5  Pôles, zéros, lieu des racines
fprintf('Pôle de la BF (K = %g) : %.4f | zéros : %d\n', K, pole(Fzr), numel(zero(Fzr)));
figure('Name','III.5 - Lieu des racines réservoir');
rlocus(Gzr); zgrid; axis equal;
title(sprintf('Lieu des racines du réservoir, T = %g s', T));

%% III.6  Erreur statique
e_stat = consigne - consigne*dcgain(Fzr);
fprintf('Erreur statique (K = %g) : %.4f m  (théorique 2/(1+12.5K) = %.4f m)\n', ...
        K, e_stat, consigne/(1+12.5*K));
