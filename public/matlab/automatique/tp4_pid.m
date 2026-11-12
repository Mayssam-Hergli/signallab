%% TP4 : Asservissement des systèmes continus par régulateur PID
% Automatique linéaire échantillonnée - INSAT
% Nécessite la Control System Toolbox (tf, pid, feedback, step, stepinfo).
clear; close all; clc;

%% III.1  Réservoir sans régulateur
G = tf(12.5, [50 1]);           % H(s)/Qe(s)
consigne = 2;                   % 2 m

% a) Boucle ouverte : H(inf) = 2 x 12.5 = 25 m > 20 m -> le réservoir déborde !
% b) Boucle fermée à retour unitaire, sans PID :
F0 = feedback(G, 1);            % 12.5 / (50s + 13.5)

figure('Name','III.1 - Sans PID');
step(consigne*G, 300); hold on; step(consigne*F0, 300); hold off; grid on;
legend('Boucle ouverte', 'Boucle fermée sans PID');
title('Réservoir sans régulateur, consigne 2 m');

%% III.1-2  Avec régulateur PID
kp = 2;  ki = 0.1;  kd = 0;     % réglage proposé (PI) : erreur nulle, dépassement ~4 %
C = pid(kp, ki, kd);            % C(s) = kp + ki/s + kd·s
F = feedback(C*G, 1);

figure('Name','III.2 - Avec PID');
step(consigne*F0, 100); hold on; step(consigne*F, 100); hold off; grid on;
legend('Sans PID', sprintf('PID kp=%g ki=%g kd=%g', kp, ki, kd));
title('Hauteur H (m)');

%% III.3  Effet de chaque gain
figure('Name','III.3 - Effet des gains');
subplot(1,3,1); hold on;
for k = [0.5 1 2 5]
    step(consigne*feedback(pid(k, 0, 0)*G, 1), 60);
end
hold off; grid on; title('Effet de k_p (ki = kd = 0)');
legend('kp=0.5','kp=1','kp=2','kp=5');

subplot(1,3,2); hold on;
for k = [0.02 0.05 0.1 0.5]
    step(consigne*feedback(pid(kp, k, 0)*G, 1), 100);
end
hold off; grid on; title(sprintf('Effet de k_i (kp = %g)', kp));
legend('ki=0.02','ki=0.05','ki=0.1','ki=0.5');

subplot(1,3,3); hold on;
for k = [0 1 5 20]
    step(consigne*feedback(pid(kp, ki, k)*G, 1), 100);
end
hold off; grid on; title(sprintf('Effet de k_d (kp = %g, ki = %g)', kp, ki));
legend('kd=0','kd=1','kd=5','kd=20');
% kp : plus rapide, erreur statique réduite mais jamais nulle.
% ki : annule l'erreur statique. Trop grand -> dépassement et oscillations.
% kd : amortit (moins de dépassement). Ici l'effet reste faible, le système étant du 1er ordre.

%% III.4  Erreur statique, temps de réponse, dépassement : avant / après
S0 = stepinfo(consigne*F0);
S  = stepinfo(consigne*F);
e0 = consigne - consigne*dcgain(F0);
e1 = consigne - consigne*dcgain(F);
fprintf('RÉSERVOIR            Sans PID      Avec PID\n');
fprintf('Erreur statique (m)  %8.4f      %8.4f\n', e0, e1);
fprintf('Temps de réponse (s) %8.2f      %8.2f\n', S0.SettlingTime, S.SettlingTime);
fprintf('Dépassement (%%)      %8.2f      %8.2f\n\n', S0.Overshoot, S.Overshoot);

%% IV  Moteur à courant continu
L  = 0.011e-3;   % 0.011 mH comme dans le tableau (si c'est 0.011 H, mettre 0.011)
R  = 0.8;   J = 0.2;   f = 1e-2;
ke = 1.91;  kc = 1.91; U = 10;  % consigne : 10 rad/s

% IV.5  Modèle : Omega/V = kc / ((Ls+R)(Js+f) + kc·ke), couple résistant cr = 0
Gm = feedback(tf(kc, [L R]) * tf(1, [J f]), ke)

% Sans PID : boucle ouverte, puis boucle fermée à retour unitaire
Fm0 = feedback(Gm, 1);
figure('Name','IV.5 - MCC sans PID');
step(U*Gm, 1); hold on; step(U*Fm0, 1); hold off; grid on;
legend('Boucle ouverte (U = 10 V)', 'Boucle fermée sans PID');
title('Vitesse \Omega (rad/s)');

% IV.5-6  Avec PID
kpm = 2;  kim = 20;  kdm = 0;   % réglage proposé (PI) : erreur nulle, pas de dépassement
Fm = feedback(pid(kpm, kim, kdm)*Gm, 1);
figure('Name','IV.6 - MCC avec PID');
step(U*Fm0, 1.5); hold on; step(U*Fm, 1.5); hold off; grid on;
legend('Sans PID', sprintf('PID kp=%g ki=%g kd=%g', kpm, kim, kdm));
title('Vitesse \Omega (rad/s), consigne 10 rad/s');

%% IV.7  Effet de chaque gain
figure('Name','IV.7 - Effet des gains MCC');
subplot(1,3,1); hold on;
for k = [1 2 5 10]
    step(U*feedback(pid(k, 0, 0)*Gm, 1), 0.5);
end
hold off; grid on; title('Effet de k_p'); legend('kp=1','kp=2','kp=5','kp=10');

subplot(1,3,2); hold on;
for k = [5 20 50 100]
    step(U*feedback(pid(kpm, k, 0)*Gm, 1), 1.5);
end
hold off; grid on; title(sprintf('Effet de k_i (kp = %g)', kpm)); legend('ki=5','ki=20','ki=50','ki=100');

subplot(1,3,3); hold on;
for k = [0 0.05 0.2 0.5]
    step(U*feedback(pid(kpm, kim, k)*Gm, 1), 1.5);
end
hold off; grid on; title(sprintf('Effet de k_d (kp = %g, ki = %g)', kpm, kim)); legend('kd=0','kd=0.05','kd=0.2','kd=0.5');

%% IV.8  Avant / après
Sm0 = stepinfo(U*Fm0);
Sm  = stepinfo(U*Fm);
fprintf('MCC                  Sans PID      Avec PID\n');
fprintf('Erreur statique      %8.4f      %8.4f  rad/s\n', U - U*dcgain(Fm0), U - U*dcgain(Fm));
fprintf('Temps de réponse (s) %8.3f      %8.3f\n', Sm0.SettlingTime, Sm.SettlingTime);
fprintf('Dépassement (%%)      %8.2f      %8.2f\n', Sm0.Overshoot, Sm.Overshoot);
