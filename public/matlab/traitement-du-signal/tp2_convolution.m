%% TP2 : Convolution des signaux numériques
clear; close all; clc;

%% A.1-A.3  Convolution linéaire par la méthode simple (fliplr)
N = 10;  M = 2*N;
x = ones(1, N);                 % x(n) = 1 pour 0 <= n <= N-1
g = 0.7.^(0:M-1);               % g(n) = 0.7^n pour 0 <= n <= M-1

y = conv_lineaire(x, g);

fprintf('Longueur de y = %d | N+M-1 = %d\n', length(y), N+M-1);   % A.3
figure('Name','A - Convolution linéaire');
subplot(3,1,1); stem(0:N-1, x, 'filled'); title('x(n)'); xlabel('n'); grid on;
subplot(3,1,2); stem(0:M-1, g, 'filled'); title('g(n) = 0.7^n'); xlabel('n'); grid on;
subplot(3,1,3); stem(0:length(y)-1, y, 'bo'); title('y(n) = x(n) * g(n) (méthode fliplr)'); xlabel('n'); grid on;

%% A.4  Convolution linéaire par la FFT
y_fft = conv_lineaire_fft(x, g);
fprintf('Écart max fliplr / FFT = %.2e\n', max(abs(y - y_fft)));
fprintf('Écart max avec conv() de MATLAB = %.2e\n', max(abs(y - conv(x, g))));
figure('Name','A.4 - Comparaison');
stem(0:length(y)-1, y, 'bo'); hold on;
stem(0:length(y_fft)-1, y_fft, 'rs'); hold off;
legend('Méthode fliplr', 'Méthode FFT'); title('Convolution linéaire : deux méthodes'); xlabel('n'); grid on;

%% A.5-A.6  Séquences f(n) = exp(0.1n), h(n) = exp(-0.1n)
Nf = 3;  Mh = 2*Nf;
f = exp( 0.1*(0:Nf-1));
h = exp(-0.1*(0:Mh-1));
yfh     = conv_lineaire(f, h);
yfh_fft = conv_lineaire_fft(f, h);

% Calcul analytique :
% y(n) = sum_m e^{0.1m} e^{-0.1(n-m)} = e^{-0.1n} * sum_{m=a}^{b} e^{0.2m}
%      = e^{-0.1n} * (e^{0.2(b+1)} - e^{0.2a}) / (e^{0.2} - 1)
% avec a = max(0, n-Mh+1) et b = min(n, Nf-1)
L = Nf + Mh - 1;
y_ana = zeros(1, L);
for n = 0:L-1
    a = max(0, n-Mh+1);  b = min(n, Nf-1);
    y_ana(n+1) = exp(-0.1*n) * (exp(0.2*(b+1)) - exp(0.2*a)) / (exp(0.2) - 1);
end
fprintf('\nA.6 : longueur = %d (N+M-1 = %d)\n', length(yfh), L);
disp(table((0:L-1)', yfh', yfh_fft', y_ana', 'VariableNames', {'n','fliplr','FFT','analytique'}));

figure('Name','A.6 - f * h');
stem(0:L-1, yfh, 'bo'); hold on; stem(0:L-1, yfh_fft, 'rs'); plot(0:L-1, y_ana, 'g*'); hold off;
legend('fliplr','FFT','analytique'); title('y(n) = f(n) * h(n)'); xlabel('n'); grid on;

%% B.1-B.3  Convolution circulaire
N = 10;
x = ones(1, N);
g = 0.7.^(0:N-1);

yc     = conv_circulaire(x, g);
yc_fft = real(ifft(fft(x) .* fft(g)));          % B.2 : FFT SANS zéros ajoutés

fprintf('\nB.3 : longueur = %d (N = %d)\n', length(yc), N);
fprintf('Écart max direct / FFT = %.2e\n', max(abs(yc - yc_fft)));
fprintf('Toutes les valeurs = somme de g = %.4f\n', sum(g));   % x = 1 partout -> y constant

figure('Name','B - Convolution circulaire');
stem(0:N-1, yc, 'bo'); hold on; stem(0:N-1, yc_fft, 'rs'); hold off;
legend('Formule directe','FFT'); title('y(m) = x(n) \otimes g(n), N = 10'); xlabel('m'); grid on;

%% B.4-B.6  Convolution circulaire de f et h (N = M = 3)
Nc = 3;
f = exp( 0.1*(0:Nc-1));
h = exp(-0.1*(0:Nc-1));
yfh_c     = conv_circulaire(f, h);
yfh_c_fft = real(ifft(fft(f) .* fft(h)));

% Calcul analytique : y(m) = sum_{n=0}^{2} e^{0.1n} e^{-0.1((m-n) mod 3)}
% m = 0 : 1*1         + e^{0.1}e^{-0.2} + e^{0.2}e^{-0.1} = 1 + e^{-0.1} + e^{0.1}
% m = 1 : 1*e^{-0.1}  + e^{0.1}*1       + e^{0.2}e^{-0.2} = 1 + e^{-0.1} + e^{0.1}
% m = 2 : 1*e^{-0.2}  + e^{0.1}e^{-0.1} + e^{0.2}*1       = 1 + e^{-0.2} + e^{0.2}
y_ana_c = [1+exp(-0.1)+exp(0.1), 1+exp(-0.1)+exp(0.1), 1+exp(-0.2)+exp(0.2)];
disp(table((0:Nc-1)', yfh_c', yfh_c_fft', y_ana_c', 'VariableNames', {'m','direct','FFT','analytique'}));

figure('Name','B.6 - f (x) h circulaire');
stem(0:Nc-1, yfh_c, 'bo'); hold on; stem(0:Nc-1, yfh_c_fft, 'rs'); plot(0:Nc-1, y_ana_c, 'g*'); hold off;
legend('direct','FFT','analytique'); title('Convolution circulaire f \otimes h, N = 3'); xlabel('m'); grid on;

%% ===== Fonctions (doivent rester à la fin du script) =====
function y = conv_lineaire(x, g)
    % Méthode "retourner et glisser" : y(n) = sum_m x(m) g(n-m)
    N = length(x); M = length(g);
    gg = fliplr(g);                         % renversement temporel g(-m)
    xp = [zeros(1, M-1) x zeros(1, M-1)];   % x entouré de zéros pour pouvoir glisser
    y  = zeros(1, N+M-1);
    for n = 1:N+M-1
        y(n) = sum(xp(n:n+M-1) .* gg);      % produit terme à terme puis somme
    end
end

function y = conv_lineaire_fft(x, g)
    % Zéros ajoutés jusqu'à N+M-1 pour que la convolution circulaire = linéaire
    L  = length(x) + length(g) - 1;
    x1 = [x zeros(1, L-length(x))];
    g1 = [g zeros(1, L-length(g))];
    y  = real(ifft(fft(x1) .* fft(g1)));
end

function y = conv_circulaire(x, g)
    % y(m) = sum_{n=0}^{N-1} x(n) g((m-n) mod N)
    N = length(x);
    y = zeros(1, N);
    for m = 0:N-1
        for n = 0:N-1
            y(m+1) = y(m+1) + x(n+1) * g(mod(m-n, N) + 1);
        end
    end
end
